import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublishedTaxonomy } from "@/lib/storefront";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let categories: { href: string; label: string }[] = [];
  let collections: { href: string; label: string }[] = [];
  let unavailable = false;
  try {
    const taxonomy = await getPublishedTaxonomy();
    categories = taxonomy.categories.map((item) => ({ href: item.href, label: item.name }));
    collections = taxonomy.collections.map((item) => ({ href: item.href, label: item.name }));
  } catch {
    unavailable = true;
  }

  return (
    <>
      {unavailable ? <p className="banner">The catalogue is temporarily unavailable.</p> : null}
      <SiteHeader categories={categories} collections={collections} />
      <main id="content">{children}</main>
      <SiteFooter categories={categories} collections={collections} />
    </>
  );
}
