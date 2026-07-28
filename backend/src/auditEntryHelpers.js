import { HttpError, normalizeText, optionalDecimal } from "./http.js";

const allowedEntryStatuses = new Set(["found", "missing", "extra", "uncertain", "count_corrected"]);

function includeField(body, field, partial) {
  return !partial || Object.hasOwn(body, field);
}

export function normalizeAuditEntryData(body, { partial = false } = {}) {
  const data = {};

  if (includeField(body, "status", partial)) {
    const status = normalizeText(body.status);

    if (status && !allowedEntryStatuses.has(status)) {
      throw new HttpError(400, `Unsupported audit entry status: ${status}`);
    }

    data.status = status;
  }

  if (includeField(body, "observedQuantityText", partial)) {
    data.observedQuantityText = normalizeText(body.observedQuantityText);
  }

  if (includeField(body, "observedQuantityValue", partial)) {
    data.observedQuantityValue = optionalDecimal(body.observedQuantityValue);
  }

  if (includeField(body, "proposedQuantityText", partial)) {
    data.proposedQuantityText = normalizeText(body.proposedQuantityText);
  }

  if (includeField(body, "proposedQuantityValue", partial)) {
    data.proposedQuantityValue = optionalDecimal(body.proposedQuantityValue);
  }

  if (includeField(body, "notes", partial)) {
    data.notes = normalizeText(body.notes);
  }

  if (includeField(body, "extraItemName", partial)) {
    data.extraItemName = normalizeText(body.extraItemName);
  }

  if (includeField(body, "itemId", partial)) {
    data.itemId = normalizeText(body.itemId);
  }

  if (includeField(body, "photoId", partial)) {
    data.photoId = normalizeText(body.photoId);
  }

  return data;
}

export const auditEntryInclude = {
  item: {
    include: {
      inventoryCounts: {
        include: {
          location: true,
        },
      },
      itemPhotos: {
        include: {
          photo: true,
          location: true,
        },
      },
    },
  },
  photo: true,
};
