import { notFound } from "next/navigation";
import { adminDatabaseNotice } from "@/components/admin/database-notice";
import { MembershipEditor } from "@/components/admin/membership-editor";
import { TaxonomyForm } from "@/components/admin/taxonomy-form";
import { assignedProducts, getTaxon } from "@/lib/catalog-admin";
import { InputError } from "@/lib/errors";
import { getDb } from "@/lib/mongodb";

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = await getDb();
    const collection = await getTaxon(db, "collection", id);
    const assigned = await assignedProducts(db, "collection", id);
    return (
      <>
        <h1>{collection.name}</h1>
        <TaxonomyForm
          kind="collection"
          id={id}
          initial={{
            name: collection.name,
            slug: collection.slug,
            description: collection.description,
            sortOrder: collection.sortOrder,
            published: collection.published,
          }}
        />
        <MembershipEditor kind="collection" taxonId={id} assigned={assigned} />
      </>
    );
  } catch (error) {
    if (error instanceof InputError && error.status === 404) notFound();
    return await adminDatabaseNotice(error);
  }
}
