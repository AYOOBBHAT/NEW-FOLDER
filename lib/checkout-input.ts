import { z } from "zod";

const text = (max: number, message: string) => z.string().trim().min(1, message).max(max, message);

export const checkoutInputSchema = z.strictObject({
  idempotencyKey: z.string().trim().regex(/^[a-zA-Z0-9-]{8,80}$/, "Checkout could not be repeated safely"),
  expectedTotal: z.number().int().nonnegative().max(10_000_000),
  buyerName: text(80, "Enter the name for delivery"),
  email: z.string().trim().email("Enter an email address").max(200),
  phone: z.string().trim().regex(/^[0-9+ ]{8,20}$/, "Enter a phone number"),
  address: z.strictObject({
    line1: text(120, "Enter the street address"),
    line2: z.string().trim().max(120).optional().default(""),
    city: text(80, "Enter the city"),
    region: text(80, "Enter the state"),
    postalCode: z.string().trim().regex(/^[A-Za-z0-9 -]{3,12}$/, "Enter the postal code"),
    country: z.string().trim().min(2).max(60).default("India"),
  }),
});

const productId = z.string().regex(/^[a-f\d]{24}$/i, "That piece is not available");

export const addCartItemSchema = z.strictObject({
  productId,
  quantity: z.number().int().min(1).max(5),
});

export const setCartItemSchema = z.strictObject({
  productId,
  quantity: z.number().int().min(0).max(5),
});

export const paymentConfirmSchema = z.strictObject({
  razorpayOrderId: z.string().regex(/^order_[a-zA-Z0-9]+$/),
  razorpayPaymentId: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
  razorpaySignature: z.string().regex(/^[a-f0-9]{64}$/),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
