export function formatSKU(sku: string) {
  if (!sku) return sku
  return sku.replace("p800_", "800ml × ").replace("p425_", "425ml × ").toUpperCase()
}
