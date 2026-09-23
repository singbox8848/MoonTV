#!/usr/bin/env node
/* eslint-disable */

/**
 * 给 @cloudflare/next-on-pages 打补丁（幂等，可反复执行）。
 * 在 `pages:build` 的最前面跑一次：`node scripts/patch-next-on-pages.js`
 *
 * 为什么需要它（尤其是第 2 组补丁）：
 *
 *   1) Windows 上 next-on-pages 的两次 spawn 会 `ENOENT`（见 pitfalls §8.3），
 *      补 `{ shell: true }` 即可。Linux/CF 上补了也无害。
 *
 *   2) 【会毁掉首页的 bug】applyVercelOverrides 把 undefined 当成 "" 再补成 "/"
 *      Next 的 `vercel build` 会为 `_next/static/not-found.txt` 生成一条
 *      **没有 path 字段** 的 override：
 *          overrides["_next/static/not-found.txt"] = { contentType: "text/plain" }
 *      而 next-on-pages 的实现是：
 *          const servedPath = addLeadingSlash(rawServedPath ?? "");  // undefined → "" → "/"
 *          if (servedPath) vercelOutput.set(servedPath, newValue);   // "/" 是真值 → 命中！
 *      结果根路由 "/" 被静态覆盖成「返回 _next/static/not-found.txt」，
 *      于是 **首页变成一句 "Not Found"，而且 HTTP 状态码是 200**（极难发现）。
 *      修法：只在 override 真的声明了 path 时才注册 servedPath。
 *      ⚠️ 不能把 servedPath 本身改成 undefined —— 后面的 `stripIndexRoute(servedPath)`
 *         会对它调 `.replace`，直接抛 "Cannot read properties of undefined"。
 *
 * 第 2 组补丁缺失会导致构建失败（宁可构建红，也别静默发出坏首页）。
 * 第 1 组补丁缺失只告警（Linux 上本来就不需要）。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IS_WINDOWS = process.platform === 'win32';

/** 兼容 pnpm 的两种布局：直接软链目录 / node_modules/.pnpm 内容寻址目录 */
function resolveNextOnPagesDist() {
  const candidates = [];

  const direct = path.join(
    ROOT,
    'node_modules/@cloudflare/next-on-pages/dist/index.js'
  );
  candidates.push(direct);

  const pnpmDir = path.join(ROOT, 'node_modules/.pnpm');
  if (fs.existsSync(pnpmDir)) {
    for (const entry of fs.readdirSync(pnpmDir)) {
      if (!entry.startsWith('@cloudflare+next-on-pages@')) continue;
      candidates.push(
        path.join(
          pnpmDir,
          entry,
          'node_modules/@cloudflare/next-on-pages/dist/index.js'
        )
      );
    }
  }

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(
    '未找到 @cloudflare/next-on-pages/dist/index.js，已尝试：\n  ' +
      candidates.join('\n  ')
  );
}

const dist = resolveNextOnPagesDist();
console.log('目标:', path.relative(ROOT, dist).split(path.sep).join('/'));

let src = fs.readFileSync(dist, 'utf8');
const log = [];

/** 字面量替换：已出现 marker 就跳过（幂等） */
function literal(name, from, to, marker) {
  if (src.includes(marker)) {
    log.push(`  · 已打过：${name}`);
    return;
  }
  if (!src.includes(from)) {
    log.push(`  ✗ 找不到锚点：${name}`);
    return;
  }
  src = src.replaceAll(from, to);
  log.push(`  ✓ 已应用：${name}`);
}

/** 正则替换（用于把「原始形态」和「上一次的错误补丁」都归一化的场景） */
function regex(name, pattern, replacement, marker) {
  if (src.includes(marker)) {
    log.push(`  · 已打过：${name}`);
    return;
  }
  if (!pattern.test(src)) {
    log.push(`  ✗ 找不到锚点：${name}`);
    return;
  }
  src = src.replace(pattern, replacement);
  log.push(`  ✓ 已应用：${name}`);
}

// —— 第 1 组：Windows spawn（非必需，Linux 上匹配不到也无所谓） ——
// 上游原文：
//   spawn(pm.name, ["add", "vercel", "-D"]);
//   spawn(spawnCmd.cmd, spawnCmd.cmdArgs);
literal(
  'spawn 补 shell:true（vercel install）',
  '(pm.name, ["add", "vercel", "-D"]);',
  '(pm.name, ["add", "vercel", "-D"], { shell: true });',
  '(pm.name, ["add", "vercel", "-D"], { shell: true })'
);

literal(
  'spawn 补 shell:true（spawnCmd）',
  'spawnCmd.cmdArgs);',
  'spawnCmd.cmdArgs, { shell: true });',
  'spawnCmd.cmdArgs, { shell: true })'
);

// —— 第 2 组：servedPath（必需，缺失即构建失败） ——
regex(
  'applyVercelOverrides：servedPath 归一化为字符串',
  /const servedPath = (?:rawServedPath === void 0 \? void 0 : )?addLeadingSlash\(rawServedPath(?: \?\? "")?\);/,
  'const servedPath = addLeadingSlash(rawServedPath ?? "");',
  'const servedPath = addLeadingSlash(rawServedPath ?? "");'
);

regex(
  'applyVercelOverrides：不注册缺失 path 的 servedPath（修复首页）',
  /(const existingStaticRecord = vercelOutput\.get\(assetPath\);\s*if \(existingStaticRecord\?\.type === "static"\) \{\s*vercelOutput\.set\(assetPath, newValue\);\s*\}\s*)if \(servedPath[^)]*\) \{/,
  '$1if (servedPath && rawServedPath !== void 0) {',
  'if (servedPath && rawServedPath !== void 0) {'
);

fs.writeFileSync(dist, src);
log.forEach((line) => console.log(line));

// —— 复查 ——
const after = fs.readFileSync(dist, 'utf8');
const hardChecks = [
  [
    'servedPath 保持字符串',
    after.includes('const servedPath = addLeadingSlash(rawServedPath ?? "");'),
  ],
  [
    'servedPath 仅在声明 path 时注册',
    after.includes('if (servedPath && rawServedPath !== void 0) {'),
  ],
];
const softChecks = [
  [
    'spawn shell:true',
    after.includes('(pm.name, ["add", "vercel", "-D"], { shell: true })'),
  ],
  ['spawnCmd shell:true', after.includes('spawnCmd.cmdArgs, { shell: true })')],
];

console.log('');
let ok = true;
for (const [name, pass] of hardChecks) {
  console.log(`  ${pass ? '✓' : '✗'} ${name}${pass ? '' : '  (必需)'}`);
  if (!pass) ok = false;
}
for (const [name, pass] of softChecks) {
  console.log(
    `  ${pass ? '✓' : '·'} ${name}${
      pass ? '' : `  (${IS_WINDOWS ? '警告' : 'Linux 不需要'})`
    }`
  );
}

if (!ok) {
  console.error(
    '\n✗ 必需的补丁未生效 —— 构建中止。' +
      '\n  这说明 @cloudflare/next-on-pages 的代码形态变了（版本升级？），' +
      '\n  请重新确认 dist/index.js 里 applyVercelOverrides 的实现后更新本脚本。'
  );
  process.exit(1);
}
console.log('\n✓ 必需的补丁就绪');
