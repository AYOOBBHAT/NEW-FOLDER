import { ObjectId, type Db } from "mongodb";
import { InputError } from "@/lib/errors";
import { hashGuestToken } from "@/lib/guest";
import { MAX_CART_LINES, MAX_LINE_QUANTITY, lineTotal, summarize, type MoneySummary } from "@/lib/money";
import type { ProductDoc } from "@/lib/types";

export type CartItem = { productId: ObjectId; quantity: number };

export type CartDoc = {
  _id: ObjectId;
  tokenHash: string;
  items: CartItem[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type QuoteLine = {
  productId: string;
  name: string;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  purchasable: boolean;
  message: string | null;
};

export type CartQuote = MoneySummary & {
  lines: QuoteLine[];
  ready: boolean;
  count: number;
};

const CART_DAYS = 30;

export async function readCart(db: Db, token: string | null) {
  if (!token) return null;
  const cart = await db.collection<CartDoc>("carts").findOne({ tokenHash: hashGuestToken(token) });
  if (!cart) return null;
  if (cart.expiresAt.getTime() <= Date.now()) return null;
  return cart;
}

export async function addCartItem(db: Db, token: string, productId: string, quantity: number) {
  const product = await requirePurchasable(db, productId, quantity);
  const cart = await ensureCart(db, token);
  const items = mergeItem(cart.items, product._id, quantity, product);
  await saveItems(db, cart._id, items);
  return quoteItems(db, items);
}

export async function setCartItem(db: Db, token: string, productId: string, quantity: number) {
  if (!ObjectId.isValid(productId)) throw new InputError("That piece is not available");
  const cart = await readCart(db, token);
  if (!cart) throw new InputError("Your bag is empty");
  const id = new ObjectId(productId);
  if (quantity === 0) {
    const items = cart.items.filter((item) => !item.productId.equals(id));
    await saveItems(db, cart._id, items);
    return quoteItems(db, items);
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
    throw new InputError("Choose a quantity between 1 and 5");
  }
  const product = await requirePurchasable(db, productId, quantity);
  const items = cart.items.map((item) => (item.productId.equals(id) ? { ...item, quantity } : item));
  if (!items.some((item) => item.productId.equals(id))) throw new InputError("That piece is not in your bag");
  assertAvailable(product, quantity);
  await saveItems(db, cart._id, items);
  return quoteItems(db, items);
}

export async function quoteCart(db: Db, token: string | null): Promise<CartQuote> {
  const cart = await readCart(db, token);
  return quoteItems(db, cart?.items ?? []);
}

export async function clearCart(db: Db, token: string) {
  const cart = await readCart(db, token);
  if (!cart) return;
  await saveItems(db, cart._id, []);
}

async function quoteItems(db: Db, items: CartItem[]): Promise<CartQuote> {
  const ids = items.map((item) => item.productId);
  const products = ids.length
    ? await db.collection<ProductDoc>("products").find({ _id: { $in: ids } }).toArray()
    : [];
  const byId = new Map(products.map((product) => [product._id.toHexString(), product]));
  const lines: QuoteLine[] = items.map((item) => {
    const product = byId.get(item.productId.toHexString());
    if (!product || !isPublic(product)) {
      return {
        productId: item.productId.toHexString(),
        name: "Unavailable piece",
        sku: null,
        unitPrice: 0,
        quantity: item.quantity,
        lineTotal: 0,
        purchasable: false,
        message: "This piece is no longer available.",
      };
    }
    const available = availableQuantity(product);
    const purchasable = available === null || item.quantity <= available;
    const unitPrice = product.price;
    return {
      productId: product._id.toHexString(),
      name: product.name,
      sku: product.sku ?? null,
      unitPrice,
      quantity: item.quantity,
      lineTotal: purchasable ? lineTotal(unitPrice, item.quantity) : 0,
      purchasable,
      message: purchasable ? null : "Not enough pieces are available.",
    };
  });
  const summary = summarize(lines.filter((line) => line.purchasable).map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity })));
  return {
    ...summary,
    lines,
    ready: lines.length > 0 && lines.every((line) => line.purchasable),
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

async function ensureCart(db: Db, token: string) {
  const now = new Date();
  const tokenHash = hashGuestToken(token);
  const expiresAt = new Date(now.getTime() + CART_DAYS * 24 * 60 * 60 * 1000);
  await db.collection<CartDoc>("carts").updateOne(
    { tokenHash },
    { $setOnInsert: { _id: new ObjectId(), tokenHash, items: [], createdAt: now }, $set: { expiresAt, updatedAt: now } },
    { upsert: true },
  );
  const cart = await db.collection<CartDoc>("carts").findOne({ tokenHash });
  if (!cart) throw new InputError("Your bag could not be saved");
  return cart;
}

function mergeItem(items: CartItem[], productId: ObjectId, quantity: number, product: ProductDoc) {
  const existing = items.find((item) => item.productId.equals(productId));
  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  if (nextQuantity > MAX_LINE_QUANTITY) throw new InputError("Choose a quantity between 1 and 5");
  assertAvailable(product, nextQuantity);
  const next = existing
    ? items.map((item) => (item.productId.equals(productId) ? { ...item, quantity: nextQuantity } : item))
    : [...items, { productId, quantity }];
  if (next.length > MAX_CART_LINES) throw new InputError("Your bag is full");
  return next;
}

async function saveItems(db: Db, id: ObjectId, items: CartItem[]) {
  const now = new Date();
  await db.collection<CartDoc>("carts").updateOne(
    { _id: id },
    { $set: { items, updatedAt: now, expiresAt: new Date(now.getTime() + CART_DAYS * 24 * 60 * 60 * 1000) } },
  );
}

async function requirePurchasable(db: Db, productId: string, quantity: number) {
  if (!ObjectId.isValid(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
    throw new InputError("That piece is not available");
  }
  const product = await db.collection<ProductDoc>("products").findOne({ _id: new ObjectId(productId) });
  if (!product || !isPublic(product)) throw new InputError("That piece is not available");
  const reason = purchaseBlock(product, quantity);
  if (reason) throw new InputError(reason);
  return product;
}

function assertAvailable(product: ProductDoc, quantity: number) {
  const reason = purchaseBlock(product, quantity);
  if (reason) throw new InputError(reason);
}

export function purchaseBlock(product: ProductDoc, quantity: number) {
  if (!isPublic(product)) return "That piece is not available";
  if (product.stockStatus === "sold_out") return "That piece is sold out";
  if (product.stockStatus === "made_to_order") return null;
  if (product.stockStatus !== "in_stock" || product.stockQuantity == null) return "That piece is not available to purchase";
  if (product.stockQuantity < quantity) return "Not enough pieces are available";
  return null;
}

function availableQuantity(product: ProductDoc) {
  if (product.stockStatus === "made_to_order") return null;
  if (product.stockStatus === "in_stock" && product.stockQuantity != null) return product.stockQuantity;
  return 0;
}

function isPublic(product: ProductDoc) {
  return product.published === true && product.archived !== true;
}
