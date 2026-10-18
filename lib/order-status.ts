import { InputError } from "@/lib/errors";

export const ORDER_STATUSES = ["pending_payment", "confirmed", "fulfilled", "cancelled"] as const;
export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "failed", "refunded"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["confirmed", "cancelled"],
  confirmed: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  unpaid: ["pending", "failed"],
  pending: ["paid", "failed"],
  paid: ["refunded"],
  failed: ["pending"],
  refunded: [],
};

export function assertOrderTransition(from: OrderStatus, to: OrderStatus) {
  if (from === to) return;
  if (!ORDER_TRANSITIONS[from].includes(to)) throw new InputError("That order status change is not allowed");
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus) {
  if (from === to) return;
  if (!PAYMENT_TRANSITIONS[from].includes(to)) throw new InputError("That payment status change is not allowed");
}

/** Paid is not a normal client transition. Callers must already hold a verified payment proof. */
export function assertPaidTransition(from: PaymentStatus) {
  assertPaymentTransition(from, "paid");
}
