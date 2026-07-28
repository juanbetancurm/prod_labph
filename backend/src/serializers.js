function decimalToNumber(value) {
  if (value == null) {
    return null;
  }

  return Number(value);
}

export function serializeCount(count) {
  if (!count) {
    return null;
  }

  return {
    id: count.id,
    itemId: count.itemId,
    locationCode: count.locationCode,
    location: count.location
      ? {
          code: count.location.code,
          label: count.location.label,
          type: count.location.type,
        }
      : undefined,
    quantityText: count.quantityText,
    quantityValue: decimalToNumber(count.quantityValue),
    unit: count.unit,
    confidence: count.confidence,
    updatedAt: count.updatedAt,
  };
}

export function serializePhoto(photo) {
  if (!photo) {
    return null;
  }

  return {
    id: photo.id,
    path: photo.path,
    publicPath: photo.publicPath,
    sourceFolder: photo.sourceFolder,
    originalFilename: photo.originalFilename,
    isUploaded: photo.isUploaded,
    uploadedAt: photo.uploadedAt,
  };
}

export function serializeItem(item) {
  if (!item) {
    return null;
  }

  const counts = item.inventoryCounts ? item.inventoryCounts.map(serializeCount) : [];
  const photos = item.itemPhotos
    ? Array.from(
        item.itemPhotos
          .reduce((map, itemPhoto) => {
            const existing = map.get(itemPhoto.photo.id) || {
              ...serializePhoto(itemPhoto.photo),
              isPrimary: false,
              locationCodes: [],
              primaryLocationCodes: [],
              links: [],
            };
            existing.locationCodes.push(itemPhoto.locationCode);
            existing.links.push({ locationCode: itemPhoto.locationCode, isPrimary: Boolean(itemPhoto.isPrimary) });
            if (itemPhoto.isPrimary) {
              existing.isPrimary = true;
              existing.primaryLocationCodes.push(itemPhoto.locationCode);
            }
            map.set(itemPhoto.photo.id, existing);
            return map;
          }, new Map())
          .values(),
      )
    : [];

  return {
    id: item.id,
    category: item.category,
    source: item.source,
    section: item.section,
    name: item.name,
    reference: item.reference,
    description: item.description,
    utility: item.utility,
    status: item.status,
    searchText: item.searchText,
    quantityText: counts.length === 1 ? counts[0].quantityText : null,
    counts,
    photos,
    locations: counts.map((count) => count.locationCode),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function serializeLocation(location) {
  if (!location) {
    return null;
  }

  return {
    code: location.code,
    label: location.label,
    type: location.type,
    mapMeta: location.mapMeta,
    itemCountSnapshot: location.itemCountSnapshot,
    inventoryCount: location._count?.inventoryCounts,
  };
}

export function serializeAuditEntry(entry) {
  return {
    id: entry.id,
    sessionId: entry.sessionId,
    itemId: entry.itemId,
    photoId: entry.photoId,
    expectedQuantityText: entry.expectedQuantityText,
    expectedQuantityValue: decimalToNumber(entry.expectedQuantityValue),
    observedQuantityText: entry.observedQuantityText,
    observedQuantityValue: decimalToNumber(entry.observedQuantityValue),
    proposedQuantityText: entry.proposedQuantityText,
    proposedQuantityValue: decimalToNumber(entry.proposedQuantityValue),
    status: entry.status,
    notes: entry.notes,
    extraItemName: entry.extraItemName,
    item: entry.item ? serializeItem(entry.item) : null,
    photo: entry.photo ? serializePhoto(entry.photo) : null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function serializeInventoryChange(change) {
  return {
    id: change.id,
    sessionId: change.sessionId,
    itemId: change.itemId,
    locationCode: change.locationCode,
    userId: change.userId,
    changeType: change.changeType,
    before: change.before,
    after: change.after,
    createdAt: change.createdAt,
    item: change.item
      ? {
          id: change.item.id,
          name: change.item.name,
        }
      : null,
    location: change.location ? serializeLocation(change.location) : null,
  };
}

export function serializeAuditSession(session) {
  return {
    id: session.id,
    locationCode: session.locationCode,
    status: session.status,
    notes: session.notes,
    teacherId: session.teacherId,
    location: session.location ? serializeLocation(session.location) : null,
    teacher: session.teacher
      ? {
          id: session.teacher.id,
          email: session.teacher.email,
          name: session.teacher.name,
        }
      : null,
    entries: session.entries ? session.entries.map(serializeAuditEntry) : [],
    changes: session.inventoryChanges ? session.inventoryChanges.map(serializeInventoryChange) : [],
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    submittedAt: session.submittedAt,
    approvedAt: session.approvedAt,
  };
}

