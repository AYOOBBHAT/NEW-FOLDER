import {
  COLORS,
  COLOR_LABELS,
  COLOR_SWATCHES,
  COLOR_VALUES,
  DESIGN_TYPES,
  DESIGN_TYPE_LABELS,
  DESIGN_TYPE_VALUES,
  MATERIALS,
  MATERIAL_LABELS,
  MATERIAL_VALUES,
  SORTS,
  SORT_VALUES,
  STOCK_STATUSES,
  STOCK_STATUS_LABELS,
  STOCK_STATUS_VALUES,
  TECHNIQUES,
  TECHNIQUE_LABELS,
  TECHNIQUE_VALUES,
  type ColorValue,
  type SortKey,
} from "@/lib/vocab";

export const PAGE_SIZE = 12;
export const MAX_PAGE = 500;

const ALLOWED_PARAMS = new Set([
  "sort",
  "page",
  "minPrice",
  "maxPrice",
  "design",
  "material",
  "color",
  "technique",
  "availability",
]);

export type CatalogueQuery = {
  sort: SortKey;
  page: number;
  minPrice: number | null;
  maxPrice: number | null;
  materials: string[];
  designTypes: string[];
  colors: string[];
  techniques: string[];
  availability: string[];
};

export type FacetOption = {
  value: string;
  label: string;
  count: number;
  swatch?: string;
};

export type CatalogueFacets = {
  designTypes: FacetOption[];
  materials: FacetOption[];
  colors: FacetOption[];
  techniques: FacetOption[];
  availability: FacetOption[];
  price: { min: number; max: number } | null;
};

export type RawFacetCounts = {
  materials: { value: string; count: number }[];
  designTypes: { value: string; count: number }[];
  colors: { value: string; count: number }[];
  techniques: { value: string; count: number }[];
  availability: { value: string; count: number }[];
  price: { min: number; max: number; count: number } | null;
};

export type ParseResult = { ok: true; query: CatalogueQuery } | { ok: false; message: string };

export function defaultCatalogueQuery(): CatalogueQuery {
  return {
    sort: "featured",
    page: 1,
    minPrice: null,
    maxPrice: null,
    materials: [],
    designTypes: [],
    colors: [],
    techniques: [],
    availability: [],
  };
}

export function toURLSearchParams(raw: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.append(key, value);
    else if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry);
    }
  }
  return params;
}

export function parseCatalogueParams(params: URLSearchParams): ParseResult {
  for (const key of new Set(params.keys())) {
    if (!ALLOWED_PARAMS.has(key)) {
      return { ok: false, message: "This catalogue link has a filter that isn't available." };
    }
  }

  const sortValue = readSingle(params, "sort");
  if (typeof sortValue !== "string" && sortValue !== undefined) return sortValue;
  let sort: SortKey = "featured";
  if (sortValue) {
    if (!SORTS.has(sortValue)) {
      return { ok: false, message: "That sort order isn't available." };
    }
    sort = sortValue as SortKey;
  }

  const pageValue = readSingle(params, "page");
  if (typeof pageValue !== "string" && pageValue !== undefined) return pageValue;
  let page = 1;
  if (pageValue !== undefined) {
    if (!/^\d+$/.test(pageValue)) {
      return { ok: false, message: "That page isn't available." };
    }
    page = Number(pageValue);
    if (page < 1 || page > MAX_PAGE) {
      return { ok: false, message: "That page isn't available." };
    }
  }

  const minPrice = readPrice(params, "minPrice");
  if (typeof minPrice !== "number" && minPrice !== null) return minPrice;
  const maxPrice = readPrice(params, "maxPrice");
  if (typeof maxPrice !== "number" && maxPrice !== null) return maxPrice;
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    return { ok: false, message: "The minimum price cannot be higher than the maximum." };
  }

  const designTypes = readList(params, "design", DESIGN_TYPES);
  if (!Array.isArray(designTypes)) return designTypes;
  const materials = readList(params, "material", MATERIALS);
  if (!Array.isArray(materials)) return materials;
  const colors = readList(params, "color", COLORS);
  if (!Array.isArray(colors)) return colors;
  const techniques = readList(params, "technique", TECHNIQUES);
  if (!Array.isArray(techniques)) return techniques;
  const availability = readList(params, "availability", STOCK_STATUSES);
  if (!Array.isArray(availability)) return availability;

  return {
    ok: true,
    query: {
      sort,
      page,
      minPrice,
      maxPrice,
      materials: orderValues(materials, MATERIAL_VALUES),
      designTypes: orderValues(designTypes, DESIGN_TYPE_VALUES),
      colors: orderValues(colors, COLOR_VALUES),
      techniques: orderValues(techniques, TECHNIQUE_VALUES),
      availability: orderValues(availability, STOCK_STATUS_VALUES),
    },
  };
}

export function buildCatalogueSearch(query: CatalogueQuery) {
  const params = new URLSearchParams();
  if (query.sort !== "featured") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.minPrice != null) params.set("minPrice", String(query.minPrice));
  if (query.maxPrice != null) params.set("maxPrice", String(query.maxPrice));
  writeList(params, "design", orderValues(query.designTypes, DESIGN_TYPE_VALUES));
  writeList(params, "material", orderValues(query.materials, MATERIAL_VALUES));
  writeList(params, "color", orderValues(query.colors, COLOR_VALUES));
  writeList(params, "technique", orderValues(query.techniques, TECHNIQUE_VALUES));
  writeList(params, "availability", orderValues(query.availability, STOCK_STATUS_VALUES));
  return params.toString();
}

export function catalogueHref(pathname: string, query: CatalogueQuery) {
  const search = buildCatalogueSearch(query);
  return search ? `${pathname}?${search}` : pathname;
}

export function hasActiveFilters(query: CatalogueQuery) {
  return (
    query.materials.length > 0 ||
    query.designTypes.length > 0 ||
    query.colors.length > 0 ||
    query.techniques.length > 0 ||
    query.availability.length > 0 ||
    query.minPrice != null ||
    query.maxPrice != null
  );
}

export function presentFacets(raw: RawFacetCounts): CatalogueFacets {
  return {
    designTypes: optionsFor(raw.designTypes, DESIGN_TYPE_VALUES, DESIGN_TYPE_LABELS),
    materials: optionsFor(raw.materials, MATERIAL_VALUES, MATERIAL_LABELS),
    colors: optionsFor(raw.colors, COLOR_VALUES, COLOR_LABELS).map((option) => ({
      ...option,
      swatch: COLOR_SWATCHES[option.value as ColorValue],
    })),
    techniques: optionsFor(raw.techniques, TECHNIQUE_VALUES, TECHNIQUE_LABELS),
    availability: optionsFor(raw.availability, STOCK_STATUS_VALUES, STOCK_STATUS_LABELS),
    price: raw.price && raw.price.count > 0 ? { min: raw.price.min, max: raw.price.max } : null,
  };
}

export function hasFacetGroups(facets: CatalogueFacets) {
  return (
    facets.designTypes.length > 0 ||
    facets.materials.length > 0 ||
    facets.colors.length > 0 ||
    facets.techniques.length > 0 ||
    facets.availability.length > 0 ||
    facets.price != null
  );
}

export function parsePriceInput(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return "invalid";
  const number = Number(trimmed);
  if (number > 10_000_000) return "invalid";
  return number;
}

function optionsFor(
  counts: { value: string; count: number }[],
  order: readonly string[],
  labels: Record<string, string>,
): FacetOption[] {
  const countByValue = new Map(counts.map((item) => [item.value, item.count]));
  return order
    .map((value) => ({
      value,
      label: labels[value] ?? value,
      count: countByValue.get(value) ?? 0,
    }))
    .filter((item) => item.count > 0);
}

function orderValues(values: string[], order: readonly string[]) {
  const selected = new Set(values);
  return order.filter((value) => selected.has(value));
}

function writeList(params: URLSearchParams, key: string, values: string[]) {
  if (values.length) params.set(key, values.join(","));
}

function readSingle(params: URLSearchParams, key: string): string | undefined | ParseResult {
  const values = params.getAll(key).map((value) => value.trim()).filter(Boolean);
  if (values.length > 1) {
    return { ok: false, message: "This catalogue link has a filter that isn't available." };
  }
  return values[0];
}

function readPrice(params: URLSearchParams, key: string): number | null | ParseResult {
  const value = readSingle(params, key);
  if (typeof value !== "string") return value ?? null;
  if (!/^\d+$/.test(value)) {
    return { ok: false, message: "Price filters need to be whole rupee amounts." };
  }
  const number = Number(value);
  if (number > 10_000_000) {
    return { ok: false, message: "Price filters need to be whole rupee amounts." };
  }
  return number;
}

function readList(params: URLSearchParams, key: string, allowed: ReadonlySet<string>): string[] | ParseResult {
  const values = params
    .getAll(key)
    .flatMap((entry) => entry.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length > 8) {
    return { ok: false, message: "This catalogue link has too many filter values." };
  }
  const unique: string[] = [];
  for (const value of values) {
    if (!allowed.has(value)) {
      return { ok: false, message: "This catalogue link has a filter that isn't available." };
    }
    if (!unique.includes(value)) unique.push(value);
  }
  return unique;
}

export const SORT_ORDER = SORT_VALUES;
