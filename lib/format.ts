const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPrice(value: number) {
  return rupees.format(value);
}

export function pieceLabel(count: number) {
  return `${count} ${count === 1 ? "piece" : "pieces"}`;
}
