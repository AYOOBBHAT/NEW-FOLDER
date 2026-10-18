"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddToCart({ productId, purchasable }: { productId: string; purchasable: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  if (!purchasable) return <p className="help">This piece is not available to purchase.</p>;

  async function add() {
    setPending(true);
    setMessage("");
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setMessage(body.error || "Could not add this piece.");
      return;
    }
    router.push("/cart");
    router.refresh();
  }

  return (
    <div className="hero-actions">
      <button className="button" type="button" disabled={pending} onClick={() => void add()}>
        {pending ? "Adding" : "Add to bag"}
      </button>
      {message ? <p className="error">{message}</p> : null}
    </div>
  );
}
