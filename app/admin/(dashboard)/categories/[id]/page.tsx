import { notFound } from "next/navigation";
import { MembershipEditor } from "@/components/admin/membership-editor";
import { TaxonomyForm } from "@/components/admin/taxonomy-form";
import { assignedProducts, getTaxon } from "@/lib/catalog-admin";
import { InputError } from "@/lib/errors";
import { getDb } from "@/lib/mongodb";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = await getDb();
    const category = await getTaxon(db, "category", id);
    const assigned = await assignedProducts(db, "category", id);
    return (
      <>
        <h1>{category.name}</h1>
        <TaxonomyForm
          kind="category"
          id={id}
          initial={{
            name: category.name,
            slug: category.slug,
            description: category.description,
            sortOrder: category.sortOrder,
            published: category.published,
          }}
        />
        <MembershipEditor kind="category" taxonId={id} assigned={assigned} />
      </>
    );
  } catch (error) {
    if (error instanceof InputError && error.status === 404) notFound();
    return <p>The database is not connected. Set MONGODB_URI and restart.</p>;
  }
}
