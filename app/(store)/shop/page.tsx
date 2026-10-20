import type { Metadata } from "next";
import { CatalogueScreen } from "@/components/catalogue-screen";

export const metadata: Metadata = {
  title: "Shop all",
  description: "The full catalogue of published shawls.",
  alternates: { canonical: "/shop" },
  robots: { index: true, follow: true },
};

export default function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CatalogueScreen scope={{ type: "shop" }} searchParams={searchParams} />;
}
