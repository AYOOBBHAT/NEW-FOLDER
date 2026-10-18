import { TaxonomyForm } from "@/components/admin/taxonomy-form";

export default function NewCollectionPage() {
  return (
    <>
      <h1>New collection</h1>
      <p className="help">A collection needs a name and a description. It does not copy product records.</p>
      <TaxonomyForm kind="collection" />
    </>
  );
}
