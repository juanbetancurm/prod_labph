import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { firstPhoto, formatQuantityFromCounts } from "../lib/format.js";

const mapImage = "/lab_distribution_map.png";

const mapRegions = [
  { id: "outside", label: "Elements without a Shelf", property: "variousOS_", locationCodes: ["Outside"], x: 11.0, y: 8.0, w: 21.0, h: 12.6 },
  { id: "chemistry-shelf", label: "Chemistry Shelf", property: "Chemistry Shelf", locationCodes: [], x: 49.4, y: 4.6, w: 13.4, h: 9.4 },
  { id: "shelves-g-h", label: "Shelves G/H", property: "variousIS_G + variousIS_H", locationCodes: ["E-F-G-H"], x: 2.7, y: 7.7, w: 6.7, h: 23.8 },
  { id: "shelves-e-f", label: "Shelves E/F", property: "variousIS_E + variousIS_F", locationCodes: ["E-F-G-H"], x: 2.7, y: 30.2, w: 6.6, h: 20.4 },
  { id: "shelves-c-d", label: "Shelves C/D", property: "variousIS_C + variousIS_D", locationCodes: ["C", "D"], x: 2.7, y: 49.1, w: 6.6, h: 18.6 },
  { id: "shelves-a-b", label: "Shelves A/B", property: "variousIS_A + variousIS_B", locationCodes: ["A", "B"], x: 2.7, y: 67.1, w: 6.7, h: 20.4 },
  { id: "shelves-i-j", label: "Shelves I/J", property: "variousIS_I + variousIS_J", locationCodes: ["I", "J"], x: 90.4, y: 7.5, w: 6.8, h: 24.0 },
  { id: "shelves-k-l", label: "Shelves K/L", property: "variousIS_K + variousIS_L", locationCodes: ["K", "L"], x: 90.5, y: 30.7, w: 6.7, h: 19.2 },
  { id: "shelves-m-n", label: "Shelves M/N", property: "variousIS_M + variousIS_N", locationCodes: ["M", "N"], x: 90.6, y: 48.7, w: 6.7, h: 19.9 },
  { id: "shelves-o-p", label: "Shelves O/P", property: "variousIS_O + variousIS_P", locationCodes: ["O", "P"], x: 90.7, y: 67.8, w: 6.7, h: 20.5 },
  { id: "blue-shelf", label: "BlueShelf", property: "BlueShelf", locationCodes: ["BlueShelf"], x: 11.1, y: 69.8, w: 11.8, h: 17.0 },
  { id: "pc-09", label: "PC 09", property: "PC 09", locationCodes: [], x: 21.8, y: 20.8, w: 12.8, h: 13.2 },
  { id: "pc-08", label: "PC 08", property: "PC 08", locationCodes: [], x: 21.6, y: 36.4, w: 12.8, h: 13.6 },
  { id: "pc-07", label: "PC 07", property: "PC 07", locationCodes: [], x: 21.8, y: 52.7, w: 12.7, h: 13.5 },
  { id: "pc-06", label: "PC 06", property: "PC 06", locationCodes: [], x: 42.4, y: 20.8, w: 13.0, h: 13.2 },
  { id: "pc-05", label: "PC 05", property: "PC 05", locationCodes: [], x: 42.4, y: 36.4, w: 13.0, h: 13.6 },
  { id: "pc-04", label: "PC 04", property: "PC 04", locationCodes: [], x: 42.4, y: 52.7, w: 13.0, h: 13.5 },
  { id: "pc-03", label: "PC 03", property: "PC 03", locationCodes: [], x: 63.0, y: 20.8, w: 12.8, h: 13.2 },
  { id: "pc-02", label: "PC 02", property: "PC 02", locationCodes: [], x: 63.0, y: 36.4, w: 12.8, h: 13.6 },
  { id: "pc-01", label: "PC 01", property: "PC 01", locationCodes: [], x: 63.1, y: 52.7, w: 12.8, h: 13.5 },
  { id: "3d-printer", label: "3D Printer", property: "3D Printer", locationCodes: [], x: 18.7, y: 51.8, w: 5.9, h: 14.1 },
  { id: "library", label: "Library", property: "Library", locationCodes: [], x: 24.2, y: 71.1, w: 11.3, h: 15.8 },
  { id: "teacher-desk", label: "Teacher Desk", property: "Teacher Desk", locationCodes: [], x: 44.7, y: 72.4, w: 12.4, h: 14.1 },
  { id: "aux-desk", label: "Aux. Desk", property: "Aux. Desk", locationCodes: [], x: 59.8, y: 71.5, w: 10.7, h: 15.2 },
  { id: "blackboard", label: "BlackBoard", property: "BlackBoard", locationCodes: [], x: 36.5, y: 88.6, w: 25.8, h: 8.7 },
  { id: "tv", label: "T.V.", property: "T.V.", locationCodes: [], x: 65.1, y: 88.4, w: 12.9, h: 8.8 },
  { id: "chairs", label: "Chairs", property: "Chairs", locationCodes: [], x: 76.1, y: 71.6, w: 11.4, h: 15.1 },
];

function dedupeById(rows) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

async function fetchRegionData(region) {
  if (!region.locationCodes.length) {
    return { items: [], photos: [] };
  }

  const [inventoryResponses, photoResponses] = await Promise.all([
    Promise.all(region.locationCodes.map((locationCode) => api.locationInventory(locationCode))),
    Promise.all(region.locationCodes.map((locationCode) => api.photos({ locationCode }))),
  ]);

  return {
    items: dedupeById(inventoryResponses.flatMap((response) => response.items)),
    photos: dedupeById(photoResponses.flatMap((response) => response.photos)),
  };
}

function shortDescription(item) {
  return item.description || item.utility || "No description available.";
}

function listQuantity(counts = []) {
  if (!counts.length) {
    return "No count";
  }

  return counts.map((count) => count.quantityText || "unspecified").join(", ");
}

function countForLocation(item, locationCode) {
  return item.counts?.find((count) => count.locationCode === locationCode) || null;
}

function photoIsLinkedToLocation(photo, locationCode) {
  return Boolean(locationCode && (photo.locationCodes?.includes(locationCode) || photo.links?.some((link) => link.locationCode === locationCode)));
}

function photoIsPrimaryForLocation(photo, locationCode) {
  return Boolean(locationCode && (photo.primaryLocationCodes?.includes(locationCode) || photo.links?.some((link) => link.locationCode === locationCode && link.isPrimary)));
}

function photosForLocation(item, locationCode) {
  return item.photos?.filter((photo) => photoIsLinkedToLocation(photo, locationCode)) || [];
}

function editableLocationCodesFor(item, region) {
  const regionCodes = region.locationCodes || [];
  const itemCodes = item.counts?.map((count) => count.locationCode).filter(Boolean) || [];
  const codes = regionCodes.length ? regionCodes : itemCodes;

  return Array.from(new Set(codes));
}

function createEditState(item, region) {
  const locationCodes = editableLocationCodesFor(item, region);
  const locationCode = locationCodes.find((code) => countForLocation(item, code)) || locationCodes[0] || "";
  const count = countForLocation(item, locationCode);

  return {
    name: item.name || "",
    category: item.category || "",
    source: item.source || "",
    section: item.section || "",
    reference: item.reference || "",
    description: item.description || "",
    utility: item.utility || "",
    status: item.status || "active",
    locationCode,
    quantityText: count?.quantityText || "",
    quantityValue: count?.quantityValue ?? "",
    unit: count?.unit || "",
    photoFile: null,
    photoMode: "add",
  };
}

function LocationListCard({ item, isSelected, onSelect }) {
  const photo = firstPhoto(item);

  return (
    <button
      className={`location-list-card${isSelected ? " is-selected" : ""}`}
      id={`location-item-${item.id}`}
      type="button"
      onClick={() => onSelect(item.id)}
    >
      <span className="location-list-card__name">{item.name}</span>
      <span className="location-list-card__quantity">
        <span>Quantity</span>
        <strong>{listQuantity(item.counts)}</strong>
      </span>
      <span className="location-list-card__description">{shortDescription(item)}</span>
      <span className="location-list-card__thumb">{photo ? <img src={photo.publicPath} alt="" loading="lazy" /> : <span>No photo</span>}</span>
    </button>
  );
}

function LocationDetailPanel({ item, selectedRegion, canEdit, onClose, onSave, onSetPrimaryPhoto, onUnlinkPhoto, panelRef }) {
  const photo = firstPhoto(item);
  const editableLocationCodes = useMemo(() => editableLocationCodesFor(item, selectedRegion), [item, selectedRegion]);
  const initialEditState = useMemo(() => createEditState(item, selectedRegion), [item, selectedRegion]);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(initialEditState);
  const [photoPreview, setPhotoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const locationPhotos = useMemo(() => photosForLocation(item, form.locationCode), [item, form.locationCode]);

  useEffect(() => {
    setIsEditing(false);
    setForm(initialEditState);
    setPhotoPreview("");
    setSaveError("");
    setSaveMessage("");
  }, [initialEditState]);
  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateLocation(locationCode) {
    const count = countForLocation(item, locationCode);

    setForm((current) => ({
      ...current,
      locationCode,
      quantityText: count?.quantityText || "",
      quantityValue: count?.quantityValue ?? "",
      unit: count?.unit || "",
    }));
  }

  function updatePhoto(event) {
    const file = event.target.files?.[0] || null;

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoPreview(file ? URL.createObjectURL(file) : "");
    updateField("photoFile", file);
  }

  function cancelEdit() {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoPreview("");
    setForm(createEditState(item, selectedRegion));
    setIsEditing(false);
    setSaveError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const payload = {
        name: form.name,
        category: form.category,
        source: form.source,
        section: form.section,
        reference: form.reference,
        description: form.description,
        utility: form.utility,
        status: form.status,
        counts: form.locationCode
          ? [
              {
                locationCode: form.locationCode,
                quantityText: form.quantityText,
                quantityValue: form.quantityValue,
                unit: form.unit,
                confidence: "teacher_edit",
              },
            ]
          : [],
      };

      const updatedItem = await onSave(item.id, payload, form.photoFile, form.locationCode, form.photoMode);
      setForm(createEditState(updatedItem, selectedRegion));
      setPhotoPreview("");
      setIsEditing(false);
      setSaveMessage("Changes saved.");
    } catch (requestError) {
      setSaveError(requestError.message);
    } finally {
      setSaving(false);
    }
  }
  async function handleSetPrimaryPhoto(photoId) {
    setSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const updatedItem = await onSetPrimaryPhoto(item.id, photoId, form.locationCode);
      setForm(createEditState(updatedItem, selectedRegion));
      setSaveMessage("Primary photo updated.");
    } catch (requestError) {
      setSaveError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlinkPhoto(photoId) {
    setSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const updatedItem = await onUnlinkPhoto(item.id, photoId, form.locationCode);
      setForm(createEditState(updatedItem, selectedRegion));
      setSaveMessage("Photo unlinked from this item.");
    } catch (requestError) {
      setSaveError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (isEditing) {
    const imageSource = photoPreview || photo?.publicPath;

    return (
      <article className="location-detail-panel location-detail-panel--editing" aria-live="polite" ref={panelRef} tabIndex={-1}>
        <form className="location-detail-edit" onSubmit={handleSubmit}>
          <div className="location-detail-panel__header">
            <div>
              <p className="eyebrow">Editing object</p>
              <h2>{item.name}</h2>
            </div>
            <div className="location-detail-panel__actions">
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button className="button button--secondary" type="button" onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>

          <div className="location-detail-edit__grid">
            <label className="location-detail-edit__wide">
              Name
              <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
            </label>
            <label>
              Category
              <input value={form.category} onChange={(event) => updateField("category", event.target.value)} required />
            </label>
            <label>
              Source
              <input value={form.source} onChange={(event) => updateField("source", event.target.value)} required />
            </label>
            <label>
              Section
              <input value={form.section} onChange={(event) => updateField("section", event.target.value)} required />
            </label>
            <label>
              Reference
              <input value={form.reference} onChange={(event) => updateField("reference", event.target.value)} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                <option value="active">Active</option>
                <option value="needs_review">Needs review</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label>
              Count location
              <select value={form.locationCode} onChange={(event) => updateLocation(event.target.value)} required>
                {editableLocationCodes.map((locationCode) => (
                  <option value={locationCode} key={locationCode}>
                    {locationCode}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity text
              <input value={form.quantityText} onChange={(event) => updateField("quantityText", event.target.value)} placeholder="Approximate quantity" />
            </label>
            <label>
              Quantity value
              <input type="number" step="0.001" value={form.quantityValue} onChange={(event) => updateField("quantityValue", event.target.value)} placeholder="Exact count" />
            </label>
            <label>
              Unit
              <input value={form.unit} onChange={(event) => updateField("unit", event.target.value)} placeholder="pcs, sets, kg..." />
            </label>
            <label className="location-detail-edit__full">
              Description
              <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={4} />
            </label>
            <label className="location-detail-edit__full">
              Utility
              <textarea value={form.utility} onChange={(event) => updateField("utility", event.target.value)} rows={4} />
            </label>
            <div className="location-detail-edit__image-block location-detail-edit__full">
              <div className="location-detail-edit__image">
                {imageSource ? <img src={imageSource} alt={form.name || item.name} /> : <span>No photo</span>}
              </div>
              <div className="location-image-actions">
                <label>
                  Image action
                  <select value={form.photoMode} onChange={(event) => updateField("photoMode", event.target.value)}>
                    <option value="add">Add photo</option>
                    <option value="primary">Set primary photo</option>
                  </select>
                </label>
                <label>
                  Upload image
                  <input type="file" accept="image/*" onChange={updatePhoto} />
                </label>
              </div>
              <p className="muted">Add photo keeps shared images. Set primary makes the uploaded image the preferred image only for this item and location.</p>
              <div className="location-photo-link-list" aria-label="Current item photos for this location">
                {locationPhotos.length ? (
                  locationPhotos.map((linkedPhoto) => {
                    const isPrimary = photoIsPrimaryForLocation(linkedPhoto, form.locationCode);

                    return (
                      <div className="location-photo-link" key={linkedPhoto.id}>
                        <img src={linkedPhoto.publicPath} alt="" loading="lazy" />
                        <div>
                          <strong>{isPrimary ? "Primary photo" : "Linked photo"}</strong>
                          <span>{linkedPhoto.originalFilename || linkedPhoto.path}</span>
                        </div>
                        <button className="button button--secondary" type="button" onClick={() => handleSetPrimaryPhoto(linkedPhoto.id)} disabled={saving || isPrimary}>
                          Set primary
                        </button>
                        <button className="button button--secondary" type="button" onClick={() => handleUnlinkPhoto(linkedPhoto.id)} disabled={saving}>
                          Unlink
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="muted">No photos are linked to this item at this location.</p>
                )}
              </div>
            </div>
          </div>

          {saveError ? <p className="status-message status-message--error">{saveError}</p> : null}
        </form>
      </article>
    );
  }

  return (
    <article className="location-detail-panel" aria-live="polite" ref={panelRef} tabIndex={-1}>
      <div className="location-detail-panel__header">
        <div>
          <p className="eyebrow">Selected object</p>
          <h2>{item.name}</h2>
        </div>
        <div className="location-detail-panel__actions">
          {canEdit && editableLocationCodes.length ? (
            <button type="button" onClick={() => setIsEditing(true)}>
              Edit
            </button>
          ) : null}
          <button className="button button--secondary" type="button" onClick={onClose}>
            Close detail
          </button>
        </div>
      </div>
      {saveMessage ? <p className="status-message status-message--ok">{saveMessage}</p> : null}
      <div className="location-detail-panel__body">
        <div className="location-detail-panel__text">
          <p className="location-detail-panel__quantity">
            <span>Quantity</span>
            <strong>{formatQuantityFromCounts(item.counts)}</strong>
          </p>
          <p>
            <strong>Description:</strong> {item.description || "No description available."}
          </p>
          <p>
            <strong>Utility:</strong> {item.utility || "No utility notes available."}
          </p>
          <p>
            <strong>Location:</strong> {item.locations?.join(", ") || "No location assigned."}
          </p>
        </div>
        <div className="location-detail-panel__image">
          {photo ? <img src={photo.publicPath} alt={item.name} /> : <span>No photo</span>}
        </div>
      </div>
    </article>
  );
}

export function LocationPage() {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultsRef = useRef(null);
  const detailPanelRef = useRef(null);
  const pendingScrollRef = useRef(false);

  const selectedRegion = useMemo(() => mapRegions.find((region) => region.id === selectedRegionId) || null, [selectedRegionId]);
  const selectedItem = useMemo(() => inventoryItems.find((item) => item.id === selectedItemId) || null, [inventoryItems, selectedItemId]);
  const countsByLocation = useMemo(() => new Map(locations.map((location) => [location.code, location.inventoryCount || 0])), [locations]);

  useEffect(() => {
    api.locations().then((data) => setLocations(data.locations));
  }, []);

  useEffect(() => {
    let active = true;

    if (!selectedRegion) {
      return undefined;
    }

    setLoading(true);
    setError("");

    if (pendingScrollRef.current) {
      window.requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    fetchRegionData(selectedRegion)
      .then((data) => {
        if (!active) {
          return;
        }

        setInventoryItems(data.items);
        setPhotos(data.photos);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          pendingScrollRef.current = false;
        }
      });

    return () => {
      active = false;
    };
  }, [selectedRegion]);

  useEffect(() => {
    if (!selectedItemId || !window.matchMedia("(max-width: 899px)").matches) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      detailPanelRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedItemId]);

  function selectItem(itemId) {
    setSelectedItemId(itemId);
  }

  function closeItemDetail() {
    const itemId = selectedItemId;

    setSelectedItemId(null);
    window.requestAnimationFrame(() => {
      document.getElementById(`location-item-${itemId}`)?.focus({ preventScroll: true });
    });
  }

  function getRegionCount(region) {
    return region.locationCodes.reduce((total, locationCode) => total + (countsByLocation.get(locationCode) || 0), 0);
  }

  function selectRegion(regionId, shouldScroll = true) {
    pendingScrollRef.current = shouldScroll;
    setSelectedItemId(null);
    setSelectedRegionId(regionId);

    if (regionId === selectedRegionId && shouldScroll) {
      window.requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  async function refreshSelectedRegion(itemId) {
    const refreshedRegion = await fetchRegionData(selectedRegion);
    const refreshedItem = refreshedRegion.items.find((item) => item.id === itemId) || null;

    setInventoryItems(refreshedRegion.items);
    setPhotos(refreshedRegion.photos);

    return refreshedItem;
  }

  async function saveMapItem(itemId, payload, photoFile, locationCode, photoMode = "add") {
    const updatedResponse = await api.updateItem(itemId, payload);

    if (photoFile) {
      const formData = new FormData();
      formData.append("photo", photoFile);
      formData.append("locationCode", locationCode);
      formData.append("itemIds", itemId);
      formData.append("mode", photoMode);

      await api.uploadPhoto(formData);
    }

    return (await refreshSelectedRegion(itemId)) || updatedResponse.item;
  }

  async function setPrimaryMapPhoto(itemId, photoId, locationCode) {
    const updatedResponse = await api.setPrimaryPhoto(itemId, photoId, { locationCode });

    return (await refreshSelectedRegion(itemId)) || updatedResponse.item;
  }

  async function unlinkMapPhoto(itemId, photoId, locationCode) {
    await api.unlinkItemPhoto(itemId, photoId, locationCode);

    return refreshSelectedRegion(itemId);
  }

  return (
    <section className="location-page stack">
      <div className="location-page__heading-row">
        <div className="page-heading">
          <p className="eyebrow">Interactive top-view inventory map</p>
          <h1>Lab locations</h1>
        </div>

        <div className="toolbar">
          <label>
            Map region
            <select value={selectedRegionId} onChange={(event) => selectRegion(event.target.value)}>
              <option value="" disabled>
                Select a location
              </option>
              {mapRegions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section className="interactive-map-layout">
        <div className="interactive-map-panel" aria-label="Physics lab top-view map">
          <img className="interactive-map-image" src={mapImage} alt="Top-view map of the physics lab" />
          {mapRegions.map((region) => {
            const count = getRegionCount(region);
            const isSelected = region.id === selectedRegion?.id;

            return (
              <button
                className={`map-region${isSelected ? " is-selected" : ""}${count ? "" : " map-region--empty"}`}
                type="button"
                style={{
                  "--x": `${region.x}%`,
                  "--y": `${region.y}%`,
                  "--w": `${region.w}%`,
                  "--h": `${region.h}%`,
                }}
                aria-pressed={isSelected}
                aria-label={`${region.label}, ${count} expected inventory records`}
                title={`${region.label} - ${region.property}`}
                key={region.id}
                onClick={() => selectRegion(region.id)}
              >
                <span className="map-region__count">{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {selectedRegion ? (
        <section className="location-results stack" ref={resultsRef}>
        <section className="panel">
          <div className="section-title">
            <div>
              <h2>{selectedRegion.label}</h2>
              <p className="muted">
                Property: {selectedRegion.property}
                {selectedRegion.locationCodes.length ? ` - Database location: ${selectedRegion.locationCodes.join(", ")}` : ""}
              </p>
              <p className="muted">{inventoryItems.length} expected inventory records</p>
            </div>
            <Link className="button" to="/review">
              Start photo review
            </Link>
          </div>
        </section>

        <StatusMessage loading={loading} error={error} empty={!inventoryItems.length && "No inventory records are currently assigned to this map region."}>
          <div className={`location-item-browser${selectedItem ? " has-selection" : ""}`}>
            <div
              className="location-item-list"
              aria-label={`${selectedRegion.label} inventory items`}
              style={{ "--item-count": inventoryItems.length }}
            >
              {inventoryItems.map((item) => (
                <div className="location-item-entry" key={item.id}>
                  <LocationListCard item={item} isSelected={item.id === selectedItemId} onSelect={selectItem} />
                  {item.id === selectedItemId ? (
                    <LocationDetailPanel
                      item={item}
                      selectedRegion={selectedRegion}
                      canEdit={Boolean(user)}
                      onClose={closeItemDetail}
                      onSave={saveMapItem}
                      onSetPrimaryPhoto={setPrimaryMapPhoto}
                      onUnlinkPhoto={unlinkMapPhoto}
                      panelRef={detailPanelRef}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </StatusMessage>

        <section className="panel location-photo-panel">
          <div className="section-title">
            <div>
              <h2>Location photos</h2>
              <p className="muted">Photos assigned to {selectedRegion.label} for review and verification.</p>
            </div>
          </div>
          {photos.length ? (
            <div className="photo-strip">
              {photos.slice(0, 12).map((photo) => (
                <a href={photo.publicPath} target="_blank" rel="noreferrer" key={photo.id}>
                  <img src={photo.publicPath} alt="" loading="lazy" />
                </a>
              ))}
            </div>
          ) : (
            <p className="muted">No photos are currently assigned to this map region.</p>
          )}
        </section>
        </section>
      ) : null}
    </section>
  );
}





