/** First Inventory opening loads this UI atlas; cached reopens may emit nothing. */
function isInventoryAsset(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      /^(?:foe[a-z]+|foe)\.innogamescdn\.com$/.test(parsed.hostname) &&
      /^\/assets\/shared\/gui\/shop_inventory\/shop_inventory_\d+-[a-z0-9]+\.(?:json|png)$/.test(
        parsed.pathname,
      )
    );
  } catch {
    return false;
  }
}
module.exports = { isInventoryAsset };
