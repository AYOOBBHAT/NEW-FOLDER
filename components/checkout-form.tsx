"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

export function CheckoutForm({ total }: { total: number }) {
  const router = useRouter();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(form: FormData) {
    setPending(true);
    setError("");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: idempotencyKey.current,
        expectedTotal: total,
        buyerName: form.get("buyerName"),
        email: form.get("email"),
        phone: form.get("phone"),
        address: {
          line1: form.get("line1"),
          line2: form.get("line2") || "",
          city: form.get("city"),
          region: form.get("region"),
          postalCode: form.get("postalCode"),
          country: form.get("country") || "India",
        },
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string; order?: { number?: string } };
    setPending(false);
    if (!response.ok || !body.order?.number) {
      setError(body.error || "Checkout could not be completed.");
      return;
    }
    router.push(`/orders/${body.order.number}`);
    router.refresh();
  }

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(new FormData(event.currentTarget));
      }}
    >
      <p className="price">Total due {formatPrice(total)}</p>
      <p className="help">The total is calculated on the server. Pieces are held for 30 minutes and stay unpaid until a verified payment is received.</p>
      <label className="field">
        <span>Name</span>
        <input name="buyerName" required autoComplete="name" />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="field">
        <span>Phone</span>
        <input name="phone" required autoComplete="tel" />
      </label>
      <label className="field">
        <span>Address</span>
        <input name="line1" required autoComplete="address-line1" />
      </label>
      <label className="field">
        <span>Address line 2</span>
        <input name="line2" autoComplete="address-line2" />
      </label>
      <label className="field">
        <span>City</span>
        <input name="city" required autoComplete="address-level2" />
      </label>
      <label className="field">
        <span>State</span>
        <input name="region" required autoComplete="address-level1" />
      </label>
      <label className="field">
        <span>Postal code</span>
        <input name="postalCode" required autoComplete="postal-code" />
      </label>
      <label className="field">
        <span>Country</span>
        <input name="country" defaultValue="India" autoComplete="country-name" />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Placing order" : "Place order"}
      </button>
    </form>
  );
}
