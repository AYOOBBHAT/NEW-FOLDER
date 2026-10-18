export const DESIGN_TYPE_VALUES = [
  "solid",
  "tonal",
  "border",
  "all-over",
  "medallion",
  "paisley",
  "floral",
  "geometric",
  "striped",
] as const;

export const MATERIAL_VALUES = [
  "pashmina",
  "cashmere",
  "wool",
  "silk",
  "pashmina-silk",
  "silk-wool",
  "cotton",
] as const;

export const COLOR_VALUES = [
  "ivory",
  "cream",
  "white",
  "black",
  "charcoal",
  "grey",
  "navy",
  "blue",
  "teal",
  "green",
  "sage",
  "burgundy",
  "maroon",
  "red",
  "rust",
  "camel",
  "beige",
  "brown",
  "gold",
  "blush",
  "pink",
  "mustard",
] as const;

export const TECHNIQUE_VALUES = ["sozni", "kani", "aari", "tilla", "amli", "handloom"] as const;

export const STOCK_STATUS_VALUES = ["in_stock", "made_to_order", "sold_out"] as const;

export const SORT_VALUES = ["featured", "newest", "price_asc", "price_desc"] as const;

export type DesignType = (typeof DESIGN_TYPE_VALUES)[number];
export type Material = (typeof MATERIAL_VALUES)[number];
export type ColorValue = (typeof COLOR_VALUES)[number];
export type Technique = (typeof TECHNIQUE_VALUES)[number];
export type StockStatus = (typeof STOCK_STATUS_VALUES)[number];
export type SortKey = (typeof SORT_VALUES)[number];

export const DESIGN_TYPE_LABELS: Record<DesignType, string> = {
  solid: "Solid",
  tonal: "Tonal texture",
  border: "Border",
  "all-over": "All-over",
  medallion: "Medallion",
  paisley: "Paisley",
  floral: "Floral",
  geometric: "Geometric",
  striped: "Striped",
};

export const MATERIAL_LABELS: Record<Material, string> = {
  pashmina: "Pashmina",
  cashmere: "Cashmere",
  wool: "Wool",
  silk: "Silk",
  "pashmina-silk": "Pashmina and silk",
  "silk-wool": "Silk and wool",
  cotton: "Cotton",
};

export const COLOR_LABELS: Record<ColorValue, string> = {
  ivory: "Ivory",
  cream: "Cream",
  white: "White",
  black: "Black",
  charcoal: "Charcoal",
  grey: "Grey",
  navy: "Navy",
  blue: "Blue",
  teal: "Teal",
  green: "Green",
  sage: "Sage",
  burgundy: "Burgundy",
  maroon: "Maroon",
  red: "Red",
  rust: "Rust",
  camel: "Camel",
  beige: "Beige",
  brown: "Brown",
  gold: "Gold",
  blush: "Blush",
  pink: "Pink",
  mustard: "Mustard",
};

export const COLOR_SWATCHES: Record<ColorValue, string> = {
  ivory: "#f3eadf",
  cream: "#f7f1e4",
  white: "#fbfbfb",
  black: "#1a1a1a",
  charcoal: "#3d3a38",
  grey: "#8d8a86",
  navy: "#1c2744",
  blue: "#315f8c",
  teal: "#2f6f6a",
  green: "#3e5c45",
  sage: "#a8b5a0",
  burgundy: "#6e2433",
  maroon: "#6b2b3a",
  red: "#8f2d2d",
  rust: "#a24b2d",
  camel: "#c4a574",
  beige: "#ddc9a8",
  brown: "#6b4b32",
  gold: "#c6a15b",
  blush: "#e7cfcb",
  pink: "#d9a3b0",
  mustard: "#c6a04a",
};

export const TECHNIQUE_LABELS: Record<Technique, string> = {
  sozni: "Sozni",
  kani: "Kani",
  aari: "Aari",
  tilla: "Tilla",
  amli: "Amli",
  handloom: "Handloom",
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In stock",
  made_to_order: "Made to order",
  sold_out: "Sold out",
};

export const SORT_LABELS: Record<SortKey, string> = {
  featured: "Featured",
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

export const DESIGN_TYPES = new Set<string>(DESIGN_TYPE_VALUES);
export const MATERIALS = new Set<string>(MATERIAL_VALUES);
export const COLORS = new Set<string>(COLOR_VALUES);
export const TECHNIQUES = new Set<string>(TECHNIQUE_VALUES);
export const STOCK_STATUSES = new Set<string>(STOCK_STATUS_VALUES);
export const SORTS = new Set<string>(SORT_VALUES);

export function labelFrom<T extends string>(labels: Record<T, string>, value: string | null | undefined) {
  if (!value || !(value in labels)) return null;
  return labels[value as T];
}
