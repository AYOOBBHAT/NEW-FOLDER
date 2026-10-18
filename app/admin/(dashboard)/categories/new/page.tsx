import { TaxonomyForm } from "@/components/admin/taxonomy-form";

export default function NewCategoryPage() {
  return (
    <>
      <h1>New category</h1>
      <p className="help">A category needs a name and a description. Empty categories are not created.</p>
      <TaxonomyForm kind="category" />
    </>
  );
}
