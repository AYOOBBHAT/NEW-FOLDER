import type { Metadata } from "next";
import { CatalogueScreen } from "@/components/catalogue-screen";
import { getPublishedCategory } from "@/lib/storefront";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const category = await getPublishedCategory(slug);
    if (!category) return { title: "Category", robots: { index: false, follow: false } };
    return {
      title: category.name,
      description: category.description,
      alternates: { canonical: `/categories/${slug}` },
      robots: { index: true, follow: true },
    };
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  return <CatalogueScreen scope={{ type: "category", slug }} searchParams={searchParams} />;
}
