"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import {
  catalogueHref,
  hasActiveFilters,
  hasFacetGroups,
  parsePriceInput,
  type CatalogueFacets,
  type CatalogueQuery,
  type FacetOption,
} from "@/lib/catalogue-params";
import { formatPrice, pieceLabel } from "@/lib/format";
import { SORT_LABELS, SORT_VALUES } from "@/lib/vocab";

type ListField = "materials" | "designTypes" | "colors" | "techniques" | "availability";

const GROUPS: { key: ListField; title: string; facet: keyof CatalogueFacets }[] = [
  { key: "designTypes", title: "Design type", facet: "designTypes" },
  { key: "materials", title: "Verified material", facet: "materials" },
  { key: "colors", title: "Colors", facet: "colors" },
  { key: "techniques", title: "Verified craft techniques", facet: "techniques" },
  { key: "availability", title: "Stock", facet: "availability" },
];

export function CatalogueControls({
  pathname,
  query,
  facets,
  total,
  scopeCount,
  pageSize,
  children,
}: {
  pathname: string;
  query: CatalogueQuery;
  facets: CatalogueFacets;
  total: number;
  scopeCount: number;
  pageSize: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState(query);
  const [minPrice, setMinPrice] = useState(query.minPrice?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(query.maxPrice?.toString() ?? "");
  const [draftMin, setDraftMin] = useState("");
  const [draftMax, setDraftMax] = useState("");
  const [priceError, setPriceError] = useState("");
  const queryKey = JSON.stringify(query);
  const titleId = useId();

  useEffect(() => {
    setMinPrice(query.minPrice?.toString() ?? "");
    setMaxPrice(query.maxPrice?.toString() ?? "");
    setDrawerOpen(false);
    setPriceError("");
  }, [queryKey, query.minPrice, query.maxPrice]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  function push(next: CatalogueQuery) {
    router.push(catalogueHref(pathname, next), { scroll: false });
  }

  function toggle(field: ListField, value: string) {
    const current = query[field];
    push({
      ...query,
      page: 1,
      [field]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    });
  }

  function applyDesktopPrice() {
    const parsed = readPrices(minPrice, maxPrice);
    if (!parsed.ok) {
      setPriceError(parsed.error);
      return;
    }
    setPriceError("");
    push({ ...query, page: 1, minPrice: parsed.min, maxPrice: parsed.max });
  }

  function clearFilters() {
    push({
      ...query,
      page: 1,
      minPrice: null,
      maxPrice: null,
      materials: [],
      designTypes: [],
      colors: [],
      techniques: [],
      availability: [],
    });
  }

  function openDrawer() {
    setDraft(query);
    setDraftMin(query.minPrice?.toString() ?? "");
    setDraftMax(query.maxPrice?.toString() ?? "");
    setPriceError("");
    setDrawerOpen(true);
  }

  function applyDrawer() {
    const parsed = readPrices(draftMin, draftMax);
    if (!parsed.ok) {
      setPriceError(parsed.error);
      return;
    }
    push({ ...draft, page: 1, minPrice: parsed.min, maxPrice: parsed.max });
  }

  const showSidebar = hasFacetGroups(facets);
  const showSort = scopeCount > 0;
  const showMobile = showSort || showSidebar || hasActiveFilters(query);
  const start = total === 0 ? 0 : (query.page - 1) * pageSize + 1;
  const end = Math.min(query.page * pageSize, total);

  return (
    <div>
      <div className="catalogue-toolbar">
        <p className="muted">
          {total === 0 ? pieceLabel(0) : `Showing ${start}–${end} of ${total}`}
        </p>
        {showSort ? (
          <div className="sort-list" aria-label="Sort">
            {SORT_VALUES.map((sort) => (
              <Link
                key={sort}
                href={catalogueHref(pathname, { ...query, sort, page: 1 })}
                aria-current={query.sort === sort ? "page" : undefined}
                scroll={false}
              >
                {SORT_LABELS[sort]}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      {hasActiveFilters(query) ? (
        <div className="chips">
          {GROUPS.flatMap((group) =>
            query[group.key].map((value) => {
              const option = (facets[group.facet] as FacetOption[]).find((item) => item.value === value);
              return (
                <button key={`${group.key}-${value}`} className="chip" type="button" onClick={() => toggle(group.key, value)}>
                  {option?.label ?? value} ×
                </button>
              );
            }),
          )}
          {query.minPrice != null || query.maxPrice != null ? (
            <button
              className="chip"
              type="button"
              onClick={() => push({ ...query, page: 1, minPrice: null, maxPrice: null })}
            >
              {priceChip(query)} ×
            </button>
          ) : null}
          <button className="text-button" type="button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : null}
      <div className={showSidebar ? "catalogue-layout" : undefined}>
        {showSidebar ? (
          <aside className="catalogue-sidebar" aria-label="Filters">
            <FilterGroups
              facets={facets}
              selected={query}
              onToggle={toggle}
              idPrefix="desktop"
              priceInputs={
                facets.price ? (
                  <PriceInputs
                    min={minPrice}
                    max={maxPrice}
                    bounds={facets.price}
                    error={priceError}
                    onMin={setMinPrice}
                    onMax={setMaxPrice}
                    onApply={applyDesktopPrice}
                  />
                ) : null
              }
            />
          </aside>
        ) : null}
        <div className="catalogue-main">{children}</div>
      </div>
      {showMobile ? (
        <button className="button mobile-filter-trigger" type="button" onClick={openDrawer}>
          Filter & Sort
        </button>
      ) : null}
      {drawerOpen ? (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="drawer-head">
              <h2 id={titleId}>Filter & Sort</h2>
              <button className="text-button" type="button" onClick={() => setDrawerOpen(false)}>
                Close
              </button>
            </div>
            {showSort ? (
              <fieldset className="drawer-sort">
                <legend>Sort</legend>
                {SORT_VALUES.map((sort) => (
                  <label key={sort} className="check">
                    <input
                      type="radio"
                      name="drawer-sort"
                      checked={draft.sort === sort}
                      onChange={() => setDraft((current) => ({ ...current, sort }))}
                    />
                    <span>{SORT_LABELS[sort]}</span>
                  </label>
                ))}
              </fieldset>
            ) : null}
            <FilterGroups
              facets={facets}
              selected={draft}
              onToggle={(field, value) =>
                setDraft((current) => ({
                  ...current,
                  [field]: current[field].includes(value)
                    ? current[field].filter((item) => item !== value)
                    : [...current[field], value],
                }))
              }
              idPrefix="drawer"
              priceInputs={
                facets.price ? (
                  <PriceInputs
                    min={draftMin}
                    max={draftMax}
                    bounds={facets.price}
                    error={priceError}
                    onMin={setDraftMin}
                    onMax={setDraftMax}
                  />
                ) : null
              }
            />
            <div className="drawer-actions">
              <button className="button-secondary" type="button" onClick={clearFilters}>
                Clear
              </button>
              <button className="button" type="button" onClick={applyDrawer}>
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterGroups({
  facets,
  selected,
  onToggle,
  idPrefix,
  priceInputs,
}: {
  facets: CatalogueFacets;
  selected: CatalogueQuery;
  onToggle: (field: ListField, value: string) => void;
  idPrefix: string;
  priceInputs: ReactNode;
}) {
  return (
    <div>
      {facets.price ? priceInputs : null}
      {GROUPS.map((group) => {
        const options = facets[group.facet] as FacetOption[];
        if (!options.length) return null;
        return (
          <fieldset className="filter-group" key={group.key}>
            <legend>{group.title}</legend>
            {options.map((option) => (
              <label className="check" key={option.value}>
                <input
                  id={`${idPrefix}-${group.key}-${option.value}`}
                  type="checkbox"
                  checked={selected[group.key].includes(option.value)}
                  onChange={() => onToggle(group.key, option.value)}
                />
                {option.swatch && /^#[0-9a-f]{6}$/i.test(option.swatch) ? (
                  <i className="swatch" style={{ background: option.swatch }} aria-hidden="true" />
                ) : null}
                <span>{option.label}</span>
                <span className="count">{option.count}</span>
              </label>
            ))}
          </fieldset>
        );
      })}
    </div>
  );
}

function PriceInputs({
  min,
  max,
  bounds,
  error,
  onMin,
  onMax,
  onApply,
}: {
  min: string;
  max: string;
  bounds: { min: number; max: number };
  error: string;
  onMin: (value: string) => void;
  onMax: (value: string) => void;
  onApply?: () => void;
}) {
  return (
    <fieldset className="filter-group">
      <legend>Price</legend>
      <p className="price-hint">
        {formatPrice(bounds.min)} – {formatPrice(bounds.max)}
      </p>
      <div className="price-fields">
        <input inputMode="numeric" aria-label="Minimum price" placeholder="Min" value={min} onChange={(event) => onMin(event.target.value)} />
        <input inputMode="numeric" aria-label="Maximum price" placeholder="Max" value={max} onChange={(event) => onMax(event.target.value)} />
      </div>
      {error ? <p className="error">{error}</p> : null}
      {onApply ? (
        <button className="button-secondary" type="button" onClick={onApply} style={{ marginTop: "0.6rem" }}>
          Apply price
        </button>
      ) : null}
    </fieldset>
  );
}

function readPrices(
  min: string,
  max: string,
): { ok: false; error: string } | { ok: true; min: number | null; max: number | null } {
  const parsedMin = parsePriceInput(min);
  const parsedMax = parsePriceInput(max);
  if (
    parsedMin === "invalid" ||
    parsedMax === "invalid" ||
    (typeof parsedMin === "number" && typeof parsedMax === "number" && parsedMin > parsedMax)
  ) {
    return { ok: false, error: "Enter whole rupee amounts, with the minimum no higher than the maximum." };
  }
  return { ok: true, min: parsedMin, max: parsedMax };
}

function priceChip(query: CatalogueQuery) {
  if (query.minPrice != null && query.maxPrice != null) return `${formatPrice(query.minPrice)}–${formatPrice(query.maxPrice)}`;
  if (query.minPrice != null) return `From ${formatPrice(query.minPrice)}`;
  return `Up to ${formatPrice(query.maxPrice ?? 0)}`;
}
