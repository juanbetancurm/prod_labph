import { useEffect, useMemo, useState } from "react";
import { ItemCard } from "../components/ItemCard.jsx";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { api } from "../lib/api.js";
import { uniqueOptions } from "../lib/format.js";

const emptyFilters = {
  q: "",
  category: "",
  source: "",
  section: "",
  locationCode: "",
  status: "",
};

export function InventoryPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.items({ limit: 1000 }).then((data) => setAllItems(data.items));
    api.locations().then((data) => setLocations(data.locations));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .items({ ...filters, limit: 1000 })
      .then((data) => setItems(data.items))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [filters]);

  const options = useMemo(
    () => ({
      categories: uniqueOptions(allItems, "category"),
      sources: uniqueOptions(allItems, "source"),
      sections: uniqueOptions(allItems, "section"),
    }),
    [allItems],
  );

  function updateDraft(field, value) {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    setFilters(draftFilters);
  }

  function clearFilters() {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  }

  return (
    <section className="stack">
      <div className="page-heading">
        <p className="eyebrow">Static catalog migrated to database</p>
        <h1>Inventory browser</h1>
      </div>

      <form className="filter-panel" onSubmit={applyFilters}>
        <label className="search-field">
          Search
          <input
            type="search"
            value={draftFilters.q}
            onChange={(event) => updateDraft("q", event.target.value)}
            placeholder="Name, reference, utility, image text"
          />
        </label>
        <label>
          Category
          <select value={draftFilters.category} onChange={(event) => updateDraft("category", event.target.value)}>
            <option value="">All</option>
            {options.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source
          <select value={draftFilters.source} onChange={(event) => updateDraft("source", event.target.value)}>
            <option value="">All</option>
            {options.sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
        <label>
          Section
          <select value={draftFilters.section} onChange={(event) => updateDraft("section", event.target.value)}>
            <option value="">All</option>
            {options.sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <select value={draftFilters.locationCode} onChange={(event) => updateDraft("locationCode", event.target.value)}>
            <option value="">All</option>
            {locations.map((location) => (
              <option key={location.code} value={location.code}>
                {location.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={draftFilters.status} onChange={(event) => updateDraft("status", event.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="needs_review">Needs review</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <div className="filter-actions">
          <button type="submit">Apply</button>
          <button className="button button--secondary" type="button" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </form>

      <StatusMessage loading={loading} error={error} empty={!items.length && "No matching inventory items."}>
        <div className="result-count">{items.length} items</div>
        <div className="item-grid">
          {items.map((item) => (
            <ItemCard item={item} key={item.id} />
          ))}
        </div>
      </StatusMessage>
    </section>
  );
}


