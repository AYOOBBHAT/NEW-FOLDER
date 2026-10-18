"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Initial = {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  published: boolean;
};

export function TaxonomyForm({
  kind,
  id,
  initial,
}: {
  kind: "category" | "collection";
  id?: string;
  initial?: Initial;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [published, setPublished] = useState(initial?.published ?? true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const noun = kind === "category" ? "category" : "collection";
  const base = kind === "category" ? "/api/admin/categories" : "/api/admin/collections";
  const listHref = kind === "category" ? "/admin/categories" : "/admin/collections";

  async function save() {
    setSaving(true);
    setError("");
    const response = await fetch(id ? `${base}/${id}` : base, {
      method: id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        description,
        sortOrder: Number(sortOrder),
        published,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; id?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error || "Could not save.");
      return;
    }
    router.push(id ? listHref : `${listHref}/${body.id}`);
    router.refresh();
  }

  async function remove() {
    if (!id || !window.confirm(`Delete this ${noun}? Pieces stay in the catalogue; only this grouping is removed.`)) return;
    setSaving(true);
    const response = await fetch(`${base}/${id}`, { method: "DELETE" });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(body.error || "Could not delete.");
      return;
    }
    router.push(listHref);
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
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label className="field">
        <span>Address</span>
        <input value={slug} onChange={(event) => setSlug(event.target.value)} required placeholder="embroidered-shawls" />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} required />
      </label>
      <label className="field">
        <span>Sort order</span>
        <input inputMode="numeric" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} required />
      </label>
      <label className="check">
        <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
        <span>Published on the shop</span>
      </label>
      {error ? <p className="error">{error}</p> : null}
      <div className="form-actions">
        <button className="button" type="submit" disabled={saving}>
          {saving ? "Saving" : "Save"}
        </button>
        {id ? (
          <button className="button-secondary" type="button" onClick={() => void remove()} disabled={saving}>
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}
