"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FulfillOrder({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function fulfill() {
    setError("");
    const response = await fetch(`/api/admin/orders/${id}/fulfill`, { method: "POST" });
    if (!response.ok) {
      setError("Could not update the order.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button className="text-button" type="button" onClick={() => void fulfill()}>
        Mark fulfilled
      </button>
      {error ? <p className="error">{error}</p> : null}
    </>
  );
}
