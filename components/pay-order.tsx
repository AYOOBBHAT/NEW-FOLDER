"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: {
      key: string;
      amount: number;
      currency: string;
      order_id: string;
      handler: (response: RazorpaySuccess) => void;
    }) => RazorpayCheckout;
  }
}

export function PayOrder({ number }: { number: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function pay() {
    setPending(true);
    setMessage("");
    const started = await fetch(`/api/orders/${number}`, { method: "POST" });
    const body = (await started.json().catch(() => ({}))) as {
      error?: string;
      keyId?: string;
      amount?: number;
      currency?: string;
      razorpayOrderId?: string | null;
    };
    if (!started.ok || !body.keyId || !body.razorpayOrderId || !body.amount || !body.currency) {
      setPending(false);
      setMessage(body.error || "Payment could not be started.");
      return;
    }
    const Razorpay = await loadRazorpay();
    if (!Razorpay) {
      setPending(false);
      setMessage("Payment could not be started.");
      return;
    }
    const checkout = new Razorpay({
      key: body.keyId,
      amount: body.amount,
      currency: body.currency,
      order_id: body.razorpayOrderId,
      handler: (response) => {
        void fetch(`/api/orders/${number}/confirm`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          }),
        }).then(() => {
          setPending(false);
          router.refresh();
        });
      },
    });
    checkout.open();
    setPending(false);
  }

  return (
    <div className="hero-actions">
      <button className="button" type="button" disabled={pending} onClick={() => void pay()}>
        {pending ? "Starting payment" : "Pay with Razorpay"}
      </button>
      {message ? <p className="error">{message}</p> : null}
    </div>
  );
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  return new Promise<Window["Razorpay"]>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => resolve(undefined);
    document.body.appendChild(script);
  });
}
