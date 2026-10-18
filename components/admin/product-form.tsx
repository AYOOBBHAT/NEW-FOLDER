"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  COLOR_VALUES,
  COLOR_LABELS,
  DESIGN_TYPE_VALUES,
  DESIGN_TYPE_LABELS,
  MATERIAL_VALUES,
  MATERIAL_LABELS,
  STOCK_STATUS_VALUES,
  STOCK_STATUS_LABELS,
  TECHNIQUE_VALUES,
  TECHNIQUE_LABELS,
} from "@/lib/vocab";

type Choice = { id: string; name: string };
export type ProductFormValues = {
  name: string;
  slug: string;
  summary: string;
  description: string;
  price: string;
  designType: string;
  material: string;
  colors: string[];
  techniques: string[];
  verifiedOrigin: string;
  stockStatus: string;
  stockQuantity: string;
  categoryIds: string[];
  collectionIds: string[];
  featured: boolean;
  featuredRank: string;
  published: boolean;
  archived: boolean;
  sku: string;
  images: FormImage[];
};

type FormImage = {
  key: string;
  url: string;
  alt: string;
  publicId: string;
  role: "product" | "model" | "detail";
  primary: boolean;
};

function newImage(): FormImage {
  return { key: Math.random().toString(36).slice(2), url: "", alt: "", publicId: "", role: "product", primary: false };
}

const emptyValues: ProductFormValues = {
  name: "",
  slug: "",
  summary: "",
  description: "",
  price: "",
  designType: "",
  material: "",
  colors: [],
  techniques: [],
  verifiedOrigin: "",
  stockStatus: "",
  stockQuantity: "",
  categoryIds: [],
  collectionIds: [],
  featured: false,
  featuredRank: "100",
  published: false,
  archived: false,
  sku: "",
  images: [],
};

export function ProductForm({
  id,
  initial,
  categories,
  collections,
}: {
  id?: string;
  initial?: ProductFormValues;
  categories: Choice[];
  collections: Choice[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>(initial ?? emptyValues);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  function patch(partial: Partial<ProductFormValues>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function toggle(field: "colors" | "techniques" | "categoryIds" | "collectionIds", value: string) {
    patch({
      [field]: form[field].includes(value) ? form[field].filter((item) => item !== value) : [...form[field], value],
    });
  }

  async function save() {
    if (!form.stockStatus) {
      setError("Choose stock availability.");
      return;
    }
    if (!/^\d+$/.test(form.price.trim())) {
      setError("Enter the price as a whole number of rupees.");
      return;
    }
    setSaving(true);
    setError("");
    setWarning("");
    const response = await fetch(id ? `/api/admin/products/${id}` : "/api/admin/products", {
      method: id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        summary: form.summary,
        description: form.description,
        price: Number(form.price),
        designType: form.designType || null,
        material: form.material || null,
        colors: form.colors,
        techniques: form.techniques,
        verifiedOrigin: form.verifiedOrigin.trim() ? form.verifiedOrigin.trim() : null,
        stockStatus: form.stockStatus,
        stockQuantity: form.stockQuantity.trim() ? Number(form.stockQuantity) : null,
        categoryIds: form.categoryIds,
        collectionIds: form.collectionIds,
        featured: form.featured,
        featuredRank: Number(form.featuredRank || "0"),
        published: form.published,
        archived: form.archived,
        sku: form.sku.trim() ? form.sku.trim() : null,
        images: form.images
          .filter((image) => image.url.trim() || image.alt.trim())
          .map((image, index) => ({
            url: image.url.trim(),
            alt: image.alt.trim(),
            publicId: image.publicId.trim() || null,
            role: image.role,
            sortOrder: index,
            primary: image.primary,
          })),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; id?: string; warning?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error || "Could not save.");
      return;
    }
    if (body.warning) setWarning(body.warning);
    if (!id && body.id) router.push(`/admin/products/${body.id}`);
    router.refresh();
  }

  function updateImage(index: number, partial: Partial<FormImage>) {
    const images = form.images.map((image, imageIndex) => (imageIndex === index ? { ...image, ...partial } : image));
    patch({ images });
  }

  function moveImage(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= form.images.length) return;
    const images = [...form.images];
    const [item] = images.splice(index, 1);
    images.splice(next, 0, item);
    patch({ images });
  }

  async function uploadImage(index: number, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("Photograph must be 5 MB or smaller.");
      return;
    }
    const image = form.images[index];
    const body = new FormData();
    body.set("file", file);
    body.set("role", image.role);
    setUploading(image.key);
    setError("");
    const response = await fetch("/api/admin/uploads", { method: "POST", body });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; secureUrl?: string; publicId?: string };
    setUploading(null);
    if (!response.ok || !payload.secureUrl || !payload.publicId) {
      setError(payload.error || "Could not upload the photograph.");
      return;
    }
    const secureUrl = payload.secureUrl;
    const publicId = payload.publicId;
    setForm((current) => ({
      ...current,
      images: current.images.map((item) => (item.key === image.key ? { ...item, url: secureUrl, publicId } : item)),
    }));
  }

  async function removeImage(image: FormImage) {
    patch({ images: form.images.filter((item) => item.key !== image.key) });
    if (!image.publicId) return;
    const response = await fetch("/api/admin/uploads", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ publicId: image.publicId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { warning?: string; error?: string };
    if (!response.ok) setError(payload.error || "Could not remove the photograph.");
    else if (payload.warning) setWarning(payload.warning);
  }

  async function remove() {
    if (!id || !window.confirm("Delete this piece permanently?")) return;
    setSaving(true);
    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error || "Could not delete.");
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <fieldset className="check-grid">
        <legend>Publishing</legend>
        <label className="check">
          <input type="checkbox" checked={form.published} onChange={(event) => patch({ published: event.target.checked, archived: event.target.checked ? false : form.archived })} />
          <span>Published</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={form.archived}
            onChange={(event) => patch({ archived: event.target.checked, published: event.target.checked ? false : form.published })}
          />
          <span>Archived</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={form.featured} onChange={(event) => patch({ featured: event.target.checked })} />
          <span>Featured</span>
        </label>
        <label className="field">
          <span>Featured rank</span>
          <input inputMode="numeric" value={form.featuredRank} onChange={(event) => patch({ featuredRank: event.target.value })} />
        </label>
      </fieldset>

      <label className="field">
        <span>Name</span>
        <input value={form.name} onChange={(event) => patch({ name: event.target.value })} required />
      </label>
      <label className="field">
        <span>SKU</span>
        <input value={form.sku} onChange={(event) => patch({ sku: event.target.value })} placeholder="Optional, unique" autoComplete="off" />
      </label>
      <label className="field">
        <span>Address</span>
        <input value={form.slug} onChange={(event) => patch({ slug: event.target.value })} placeholder="Leave blank to generate" />
      </label>
      <label className="field">
        <span>Summary</span>
        <textarea rows={2} value={form.summary} onChange={(event) => patch({ summary: event.target.value })} />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea rows={6} value={form.description} onChange={(event) => patch({ description: event.target.value })} />
      </label>
      <label className="field">
        <span>Price in rupees</span>
        <input inputMode="numeric" value={form.price} onChange={(event) => patch({ price: event.target.value })} required />
      </label>
      <label className="field">
        <span>Stock</span>
        <select value={form.stockStatus} onChange={(event) => patch({ stockStatus: event.target.value })} required>
          <option value="">Select availability</option>
          {STOCK_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {STOCK_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Quantity on hand</span>
        <input inputMode="numeric" value={form.stockQuantity} onChange={(event) => patch({ stockQuantity: event.target.value })} placeholder="Optional" />
      </label>

      <fieldset className="check-grid">
        <legend>Verified attributes</legend>
        <p className="help">
          Record these only from documents or someone who knows the piece. Photographs are display assets and are never used to assign material, craft, authenticity, or origin.
        </p>
        <label className="field">
          <span>Design type</span>
          <select value={form.designType} onChange={(event) => patch({ designType: event.target.value })}>
            <option value="">Not recorded</option>
            {DESIGN_TYPE_VALUES.map((value) => (
              <option key={value} value={value}>
                {DESIGN_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Verified material</span>
          <select value={form.material} onChange={(event) => patch({ material: event.target.value })}>
            <option value="">Not verified</option>
            {MATERIAL_VALUES.map((value) => (
              <option key={value} value={value}>
                {MATERIAL_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span>Colors</span>
          <div className="check-grid">
            {COLOR_VALUES.map((value) => (
              <label className="check" key={value}>
                <input type="checkbox" checked={form.colors.includes(value)} onChange={() => toggle("colors", value)} />
                <span>{COLOR_LABELS[value]}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <span>Verified craft techniques</span>
          <div className="check-grid">
            {TECHNIQUE_VALUES.map((value) => (
              <label className="check" key={value}>
                <input type="checkbox" checked={form.techniques.includes(value)} onChange={() => toggle("techniques", value)} />
                <span>{TECHNIQUE_LABELS[value]}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Verified place of making</span>
          <input
            value={form.verifiedOrigin}
            onChange={(event) => patch({ verifiedOrigin: event.target.value })}
            placeholder="Leave blank unless confirmed"
            autoComplete="off"
          />
        </label>
      </fieldset>

      <fieldset className="check-grid">
        <legend>Photographs</legend>
        <p className="help">
          Upload a product, worn, or detail photograph, or paste an https URL. Files are display assets. They are never used to assign material, craft, authenticity, or origin.
        </p>
        {form.images.map((image, index) => (
          <div key={image.key} className="form-grid">
            <label className="field">
              <span>Photograph type</span>
              <select value={image.role} onChange={(event) => updateImage(index, { role: event.target.value as FormImage["role"] })}>
                <option value="product">Product</option>
                <option value="model">Worn</option>
                <option value="detail">Detail</option>
              </select>
            </label>
            <label className="check">
              <input type="radio" name="primary-image" checked={image.primary} onChange={() => patch({ images: form.images.map((item, imageIndex) => ({ ...item, primary: imageIndex === index })) })} />
              <span>Primary photograph</span>
            </label>
            <label className="field">
              <span>Upload</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void uploadImage(index, file);
                }}
              />
            </label>
            <label className="field">
              <span>Image URL</span>
              <input
                value={image.url}
                onChange={(event) => updateImage(index, { url: event.target.value, publicId: "" })}
                placeholder="https://"
                readOnly={Boolean(image.publicId)}
              />
            </label>
            <label className="field">
              <span>Description of the photograph</span>
              <input value={image.alt} onChange={(event) => updateImage(index, { alt: event.target.value })} />
            </label>
            <div className="form-actions">
              <button className="text-button" type="button" onClick={() => moveImage(index, -1)} disabled={index === 0}>
                Move earlier
              </button>
              <button className="text-button" type="button" onClick={() => moveImage(index, 1)} disabled={index === form.images.length - 1}>
                Move later
              </button>
              <button className="text-button" type="button" onClick={() => void removeImage(image)}>
                Remove photograph
              </button>
              {uploading === image.key ? <span className="help">Uploading</span> : null}
            </div>
          </div>
        ))}
        {form.images.length < 8 ? (
          <button className="button-secondary" type="button" onClick={() => patch({ images: [...form.images, newImage()] })}>
            Add photograph
          </button>
        ) : null}
      </fieldset>

      <fieldset className="check-grid">
        <legend>Categories</legend>
        <p className="help">A piece can belong to more than one category. Shop all lists it once.</p>
        {categories.map((category) => (
          <label className="check" key={category.id}>
            <input type="checkbox" checked={form.categoryIds.includes(category.id)} onChange={() => toggle("categoryIds", category.id)} />
            <span>{category.name}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="check-grid">
        <legend>Collections</legend>
        <p className="help">Collections are curated lists, separate from categories and from verified attributes.</p>
        {collections.map((collection) => (
          <label className="check" key={collection.id}>
            <input
              type="checkbox"
              checked={form.collectionIds.includes(collection.id)}
              onChange={() => toggle("collectionIds", collection.id)}
            />
            <span>{collection.name}</span>
          </label>
        ))}
      </fieldset>
      {error ? <p className="error">{error}</p> : null}
      {warning ? <p className="help">{warning}</p> : null}
      <div className="form-actions">
        <button className="button" type="submit" disabled={saving}>
          {saving ? "Saving" : "Save piece"}
        </button>
        {id ? (
          <button className="button-secondary" type="button" disabled={saving} onClick={() => void remove()}>
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
