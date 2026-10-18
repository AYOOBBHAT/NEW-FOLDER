import Link from "next/link";
import { catalogueHref, type CatalogueQuery } from "@/lib/catalogue-params";

export function Pagination({
  pathname,
  query,
  page,
  pageSize,
  total,
}: {
  pathname: string;
  query: CatalogueQuery;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  const pages: number[] = [];
  for (let number = start; number <= end; number += 1) pages.push(number);

  return (
    <nav className="pager" aria-label="Pagination">
      {page > 1 ? <Link href={catalogueHref(pathname, { ...query, page: page - 1 })}>Previous</Link> : <span />}
      {start > 1 ? <Link href={catalogueHref(pathname, { ...query, page: 1 })}>1</Link> : null}
      {pages.map((number) =>
        number === page ? (
          <span key={number} aria-current="page">
            {number}
          </span>
        ) : (
          <Link key={number} href={catalogueHref(pathname, { ...query, page: number })}>
            {number}
          </Link>
        ),
      )}
      {end < totalPages ? <Link href={catalogueHref(pathname, { ...query, page: totalPages })}>{totalPages}</Link> : null}
      {page < totalPages ? <Link href={catalogueHref(pathname, { ...query, page: page + 1 })}>Next</Link> : <span />}
    </nav>
  );
}
