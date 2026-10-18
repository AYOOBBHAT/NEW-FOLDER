import { notFound } from "next/navigation";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import { getProduct, taxonChoices } from "@/lib/catalog-admin";
import { InputError } from "@/lib/errors";
import { getDb } from "@/lib/mongodb";
import { COLORS, DESIGN_TYPES, MATERIALS, STOCK_STATUSES, TECHNIQUES } from "@/lib/vocab";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = await getDb();
    const [product, choices] = await Promise.all([getProduct(db, id), taxonChoices(db)]);
    const initial: ProductFormValues = {
      name: product.name,
      slug: product.slug,
      summary: product.summary,
      description: product.description,
      price: String(product.price),
      designType: product.designType && DESIGN_TYPES.has(product.designType) ? product.designType : "",
      material: product.material && MATERIALS.has(product.material) ? product.material : "",
      colors: product.colors.filter((color) => COLORS.has(color)),
      techniques: product.techniques.filter((technique) => TECHNIQUES.has(technique)),
      verifiedOrigin: product.verifiedOrigin ?? "",
      stockStatus: STOCK_STATUSES.has(product.stockStatus) ? product.stockStatus : "",
      stockQuantity: product.stockQuantity == null ? "" : String(product.stockQuantity),
      categoryIds: product.categoryIds.map((item) => item.toHexString()),
      collectionIds: product.collectionIds.map((item) => item.toHexString()),
      featured: product.featured,
      featuredRank: String(product.featuredRank),
      published: product.published,
      archived: Boolean(product.archived),
      sku: product.sku ?? "",
      images: product.images.map((image, index) => ({
        key: image.publicId || `${image.url}-${index}`,
        url: image.url,
        alt: image.alt,
        publicId: image.publicId ?? "",
        role: image.role === "model" || image.role === "detail" ? image.role : "product",
        primary: Boolean(image.primary),
      })),
    };
    return (
      <>
        <h1>{product.name}</h1>
        <ProductForm id={id} initial={initial} categories={choices.categories} collections={choices.collections} />
      </>
    );
  } catch (error) {
    if (error instanceof InputError && error.status === 404) notFound();
    return <p>The database is not connected. Set MONGODB_URI and restart.</p>;
  }
}
