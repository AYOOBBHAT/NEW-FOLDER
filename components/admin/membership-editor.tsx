"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Choice = { id: string; name: string };
type Assigned = { id: string; name: string; published: boolean };
type SearchHit = Assigned & { categoryIds: string[]; collectionIds: string[] };

export function MembershipEditor({
  kind,
  taxonId,
  assigned,
}: {
  kind: "category" | "collection";
  taxonId: string;
  assigned: Assigned[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const endpoint = kind === "category" ? `/api/admin/categories/${taxonId}/membership` : `/api/admin/collections/${taxonId}/membership`;
  const assignedIds = new Set(assigned.map((item) => item.id));

  async function search(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch(`/api/admin/products?q=${encodeURIComponent(query)}&view=summary`);
    const body = (await response.json().catch(() => ({}))) as { error?: string; products?: SearchHit[] };
    if (!response.ok) {
      setError(body.error || "Could not search.");
      return;
    }
    setHits(body.products ?? []);
  }

  async function toggle(productId: string, nextAssigned: boolean) {
    setBusyId(productId);
    setError("");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, assigned: nextAssigned }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setBusyId("");
    if (!response.ok) {
      setError(body.error || "Could not update membership.");
      return;
    }
    router.refresh();
  }

  return (
    <section>
      <h2>Pieces in this {kind === "category" ? "category" : "collection"}</h2>
      <p className="help">Membership updates the same product record. It does not copy the shawl.</p>
      {assigned.length ? (
        <ul>
          {assigned.map((product) => (
            <li key={product.id}>
              <a href={`/admin/products/${product.id}`}>{product.name}</a>
              {product.published ? "" : " · unpublished"}{" "}
              <button className="text-button" type="button" disabled={busyId === product.id} onClick={() => void toggle(product.id, false)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No pieces assigned yet.</p>
      )}
      <form className="search-form" onSubmit={(event) => void search(event)}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pieces to assign" aria-label="Search pieces" />
        <button className="button-secondary" type="submit">
          Search
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {hits.length ? (
        <ul>
          {hits.map((product) => {
            const already = assignedIds.has(product.id);
            return (
              <li key={product.id}>
                {product.name}
                {product.published ? "" : " · unpublished"}{" "}
                <button className="text-button" type="button" disabled={busyId === product.id || already} onClick={() => void toggle(product.id, true)}>
                  {already ? "Assigned" : "Assign"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
