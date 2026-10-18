import { CURRENCY } from "@/lib/types";

export const MAX_LINE_QUANTITY = 5;
export const MAX_CART_LINES = 12;
export const RESERVATION_MINUTES = 30;

/** Charged amounts are whole rupees. Shipping, discount, and tax are server rules, never client input. */
export const SHIPPING_RUPEES = 0;
export const DISCOUNT_RUPEES = 0;
export const TAX_RUPEES = 0;

export type MoneyLine = { unitPrice: number; quantity: number };

export type MoneySummary = {
  currency: typeof CURRENCY;
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
};

export function lineTotal(unitPrice: number, quantity: number) {
  if (!Number.isInteger(unitPrice) || unitPrice < 0 || unitPrice > 10_000_000) {
    throw new Error("Invalid unit price");
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
    throw new Error("Invalid quantity");
  }
  const total = unitPrice * quantity;
  if (!Number.isSafeInteger(total)) throw new Error("Invalid line total");
  return total;
}

export function summarize(lines: MoneyLine[]): MoneySummary {
  const subtotal = lines.reduce((sum, line) => sum + lineTotal(line.unitPrice, line.quantity), 0);
  const shipping = SHIPPING_RUPEES;
  const discount = DISCOUNT_RUPEES;
  const tax = TAX_RUPEES;
  const total = subtotal + shipping - discount + tax;
  if (!Number.isInteger(total) || total < 0 || discount > subtotal) throw new Error("Invalid order total");
  return { currency: CURRENCY, subtotal, shipping, discount, tax, total };
}

export function amountPaise(totalRupees: number) {
  if (!Number.isInteger(totalRupees) || totalRupees < 1) throw new Error("Invalid charge");
  return totalRupees * 100;
}
