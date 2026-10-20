import { adminDatabaseNotice } from "@/components/admin/database-notice";
import { ProductForm } from "@/components/admin/product-form";
import { taxonChoices } from "@/lib/catalog-admin";
import { getDb } from "@/lib/mongodb";

export default async function NewProductPage() {
  try {
    const db = await getDb();
    const choices = await taxonChoices(db);
    return (
      <>
        <h1>New piece</h1>
        <ProductForm categories={choices.categories} collections={choices.collections} />
      </>
    );
  } catch (error) {
    return await adminDatabaseNotice(error);
  }
}
