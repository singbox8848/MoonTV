/**
 * 影片分类的唯一数据源。
 *
 * 重构前，「电影/剧集/综艺」的分类定义散落在三个地方：
 *   - `components/DoubanSelector.tsx` 里的 if/else + 两套胶囊选择器
 *   - `lib/nav.ts` 的导航项
 *   - `app/douban/page.tsx` 的 `initialSelection()` / `getRequestParams()`
 * 三处各自维护一份选项，改动时极易不同步（原实现里 `custom` 分类就因此彻底失效）。
 *
 * 现在改为一张声明式注册表：每个分类只需要描述「走豆瓣哪个接口、有哪些筛选轴」，
 * 导航、浏览页、首页分区都从同一处读取。
 *
 * ▼ URL 参数约定（改造后不再有歧义）
 *   `type`     —— 当前分类 tab：movie | tv | show
 *   `category` —— 电影的分类轴（热门/最新/豆瓣高分/冷门佳片）
 *   `area`     —— 电影的地区轴（全部/华语/欧美/韩国/日本）
 *   `genre`    —— 剧集、综艺的类型轴（tv_domestic / show_foreign …）
 *
 * 旧链接 `/douban?type=tv` 仍然可用；`category`/`area`/`genre` 会回落到各分类默认值。
 */

export type DoubanKind = 'movie' | 'tv';

/** 筛选轴挂载到豆瓣接口上的参数名 */
export type ApiParam = 'category' | 'type';

export interface FilterAxisOption {
  label: string;
  value: string;
}

export interface FilterAxis {
  /** URL 查询参数名，同时也是选择状态的键 */
  param: string;
  /** 这个轴最终写入豆瓣接口的哪个参数 */
  api: ApiParam;
  /** 行内展示名，如「分类」「地区」 */
  label: string;
  /** 默认值 */
  fallback: string;
  options: readonly FilterAxisOption[];
}

export interface CategoryDef {
  /** URL 中 `type` 的取值，同时作为稳定 key */
  key: string;
  label: string;
  desc: string;
  kind: DoubanKind;
  /** 未被轴覆盖时的接口兜底参数 */
  base: { category: string; type: string };
  axes: readonly FilterAxis[];
}

// ---------------------------------------------------------------------------
// 筛选轴定义
// ---------------------------------------------------------------------------

const MOVIE_CATEGORY_AXIS: FilterAxis = {
  param: 'category',
  api: 'category',
  label: '分类',
  fallback: '热门',
  options: [
    { label: '热门', value: '热门' },
    { label: '最新', value: '最新' },
    { label: '豆瓣高分', value: '豆瓣高分' },
    { label: '冷门佳片', value: '冷门佳片' },
  ],
};

const MOVIE_AREA_AXIS: FilterAxis = {
  param: 'area',
  api: 'type',
  label: '地区',
  fallback: '全部',
  options: [
    { label: '全部', value: '全部' },
    { label: '华语', value: '华语' },
    { label: '欧美', value: '欧美' },
    { label: '韩国', value: '韩国' },
    { label: '日本', value: '日本' },
  ],
};

const TV_GENRE_AXIS: FilterAxis = {
  param: 'genre',
  api: 'type',
  label: '类型',
  fallback: 'tv',
  options: [
    { label: '全部', value: 'tv' },
    { label: '国产剧', value: 'tv_domestic' },
    { label: '美剧', value: 'tv_american' },
    { label: '日剧', value: 'tv_japanese' },
    { label: '韩剧', value: 'tv_korean' },
    { label: '动漫', value: 'tv_animation' },
    { label: '纪录片', value: 'tv_documentary' },
  ],
};

const SHOW_REGION_AXIS: FilterAxis = {
  param: 'genre',
  api: 'type',
  label: '类型',
  fallback: 'show',
  options: [
    { label: '全部', value: 'show' },
    { label: '国内', value: 'show_domestic' },
    { label: '国外', value: 'show_foreign' },
  ],
};

// ---------------------------------------------------------------------------
// 分类注册表
// ---------------------------------------------------------------------------

export const CATEGORIES: readonly CategoryDef[] = [
  {
    key: 'movie',
    label: '电影',
    desc: '豆瓣高分与热门院线',
    kind: 'movie',
    base: { category: '热门', type: '全部' },
    axes: [MOVIE_CATEGORY_AXIS, MOVIE_AREA_AXIS],
  },
  {
    key: 'tv',
    label: '剧集',
    desc: '正在热播与口碑好剧',
    kind: 'tv',
    base: { category: 'tv', type: 'tv' },
    axes: [TV_GENRE_AXIS],
  },
  {
    key: 'show',
    label: '综艺',
    desc: '每周更新的热门综艺',
    kind: 'tv',
    base: { category: 'show', type: 'show' },
    axes: [SHOW_REGION_AXIS],
  },
];

/** 首页轮播分区 —— 复用注册表，避免首页与浏览页描述不一致 */
export interface HomeRow {
  key: string;
  title: string;
  /** 指向浏览页对应 tab */
  href: string;
  category: CategoryDef;
}

export const HOME_ROWS: readonly HomeRow[] = CATEGORIES.map((category) => ({
  key: category.key,
  title:
    category.key === 'movie'
      ? '热门电影'
      : category.key === 'tv'
      ? '热门剧集'
      : '热门综艺',
  href: `/douban?type=${category.key}`,
  category,
}));

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

export function findCategory(key: string | null | undefined): CategoryDef {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];
}

export function isKnownCategory(key: string | null | undefined): boolean {
  return CATEGORIES.some((c) => c.key === key);
}

/** 某个分类下的全部筛选默认值，如 `{ category: '热门', area: '全部' }` */
export function defaultSelections(
  category: CategoryDef
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const axis of category.axes) result[axis.param] = axis.fallback;
  return result;
}

/**
 * 把「分类 + 当前选择」折算成豆瓣接口参数。
 * 未被轴覆盖的参数取 `base`，因此新增分类只需改本文件。
 */
export function toApiParams(
  category: CategoryDef,
  selections: Record<string, string>
): { kind: DoubanKind; category: string; type: string } {
  const params = { ...category.base };
  for (const axis of category.axes) {
    params[axis.api] = selections[axis.param] ?? axis.fallback;
  }
  return { kind: category.kind, ...params };
}

/** 用于依赖比较的稳定字符串，避免对象引用每帧都变 */
export function paramsKey(params: {
  kind: string;
  category: string;
  type: string;
}): string {
  return `${params.kind}|${params.category}|${params.type}`;
}

/** 从 URL search params 还原某分类的选择状态（缺失项落回默认值） */
export function selectionsFromParams(
  category: CategoryDef,
  params: URLSearchParams
): Record<string, string> {
  const result = defaultSelections(category);
  for (const axis of category.axes) {
    const value = params.get(axis.param);
    if (value && axis.options.some((o) => o.value === value)) {
      result[axis.param] = value;
    }
  }
  return result;
}

/** 生成可分享的浏览页链接 */
export function buildBrowseHref(
  category: CategoryDef,
  selections: Record<string, string>
): string {
  const search = new URLSearchParams();
  search.set('type', category.key);
  for (const axis of category.axes) {
    const value = selections[axis.param];
    if (value && value !== axis.fallback) search.set(axis.param, value);
  }
  return `/douban?${search.toString()}`;
}
