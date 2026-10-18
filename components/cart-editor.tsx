"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import type { CartQuote } from "@/lib/cart";

export function CartEditor({ quote }: { quote: CartQuote }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function update(productId: string, quantity: number) {
    setPending(true);
    setError("");
    const response = await fetch("/api/cart", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(body.error || "Could not update the bag.");
      return;
    }
    router.refresh();
  }

  if (!quote.lines.length) return <p className="muted">Your bag is empty.</p>;

  return (
    <div className="form-grid">
      {quote.lines.map((line) => (
        <div key={line.productId}>
          <h2>{line.name}</h2>
          {line.sku ? <p className="muted">{line.sku}</p> : null}
          {line.purchasable ? <p className="price">{formatPrice(line.unitPrice)}</p> : <p className="help">{line.message}</p>}
          <div className="form-actions">
            <label className="field">
              <span>Quantity</span>
              <input
                inputMode="numeric"
                defaultValue={String(line.quantity)}
                disabled={pending || !line.purchasable}
                onBlur={(event) => {
                  const quantity = Number(event.target.value);
                  if (Number.isInteger(quantity) && quantity !== line.quantity) void update(line.productId, quantity);
                }}
              />
            </label>
            <button className="text-button" type="button" disabled={pending} onClick={() => void update(line.productId, 0)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <p>
        Shipping {formatPrice(quote.shipping)} · Tax {formatPrice(quote.tax)} · Discount {formatPrice(quote.discount)}
      </p>
      <p className="price">Total {formatPrice(quote.total)}</p>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
