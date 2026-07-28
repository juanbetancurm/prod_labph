export function formatQuantityFromCounts(counts = []) {
  if (!counts.length) {
    return "No count";
  }

  return counts
    .map((count) => {
      const label = count.location?.label || count.locationCode;
      return `${label}: ${count.quantityText || "unspecified"}`;
    })
    .join("; ");
}

export function firstPhoto(item) {
  return item?.photos?.[0] || null;
}

export function uniqueOptions(items, field) {
  return Array.from(new Set(items.map((item) => item[field]).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function needsApproval(entry) {
  return (
    ["missing", "extra", "count_corrected"].includes(entry.status) ||
    Boolean(entry.observedQuantityText || entry.observedQuantityValue != null || entry.proposedQuantityText || entry.proposedQuantityValue != null)
  );
}
