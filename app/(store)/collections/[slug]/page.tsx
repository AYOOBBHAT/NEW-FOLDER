import type { Metadata } from "next";
import { CatalogueScreen } from "@/components/catalogue-screen";
import { getPublishedCollection } from "@/lib/storefront";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const collection = await getPublishedCollection(slug);
    if (!collection) return { title: "Collection" };
    return { title: collection.name, description: collection.description };
  } catch {
    return { title: "Collection" };
  }
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  return <CatalogueScreen scope={{ type: "collection", slug }} searchParams={searchParams} />;
}
