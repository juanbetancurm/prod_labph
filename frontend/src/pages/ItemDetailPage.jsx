import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import { firstPhoto, formatQuantityFromCounts } from "../lib/format.js";

export function ItemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .item(id)
      .then((data) => {
        setItem(data.item);
        setForm({
          name: data.item.name,
          category: data.item.category,
          source: data.item.source,
          section: data.item.section,
          reference: data.item.reference || "",
          description: data.item.description || "",
          utility: data.item.utility || "",
          status: data.item.status,
          counts: data.item.counts.map((count) => ({
            locationCode: count.locationCode,
            quantityText: count.quantityText || "",
            quantityValue: count.quantityValue ?? "",
            unit: count.unit || "",
            confidence: count.confidence || "teacher_edit",
          })),
        });
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [id]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateCount(index, field, value) {
    setForm((current) => ({
      ...current,
      counts: current.counts.map((count, countIndex) => (countIndex === index ? { ...count, [field]: value } : count)),
    }));
  }

  async function saveItem(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const data = await api.updateItem(item.id, form);
      setItem(data.item);
      setMessage("Item saved.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  const photo = firstPhoto(item);

  return (
    <section className="stack">
      <Link to="/inventory" className="text-link">
        Back to inventory
      </Link>

      <StatusMessage loading={loading} error={error && !item ? error : ""}>
        {item && form && (
          <div className="detail-layout">
            <aside className="photo-column">
              {photo ? <img className="detail-photo" src={photo.publicPath} alt="" /> : <div className="empty-photo">No photo</div>}
              <div className="thumb-grid">
                {item.photos.map((itemPhoto) => (
                  <a href={itemPhoto.publicPath} target="_blank" rel="noreferrer" key={itemPhoto.id}>
                    <img src={itemPhoto.publicPath} alt="" loading="lazy" />
                  </a>
                ))}
              </div>
            </aside>

            <div className="stack">
              <div className="page-heading">
                <p className="eyebrow">{item.section}</p>
                <h1>{item.name}</h1>
                <p className="muted">{formatQuantityFromCounts(item.counts)}</p>
              </div>

              {user ? (
                <form className="panel form-grid" onSubmit={saveItem}>
                  <label>
                    Name
                    <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
                  </label>
                  <div className="form-row">
                    <label>
                      Category
                      <input value={form.category} onChange={(event) => updateField("category", event.target.value)} required />
                    </label>
                    <label>
                      Source
                      <input value={form.source} onChange={(event) => updateField("source", event.target.value)} required />
                    </label>
                  </div>
                  <label>
                    Section
                    <input value={form.section} onChange={(event) => updateField("section", event.target.value)} required />
                  </label>
                  <label>
                    Reference
                    <input value={form.reference} onChange={(event) => updateField("reference", event.target.value)} />
                  </label>
                  <label>
                    Description
                    <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={4} />
                  </label>
                  <label>
                    Utility
                    <textarea value={form.utility} onChange={(event) => updateField("utility", event.target.value)} rows={4} />
                  </label>
                  <label>
                    Status
                    <select value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                      <option value="active">Active</option>
                      <option value="needs_review">Needs review</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>

                  <div className="section-title">
                    <h2>Counts</h2>
                  </div>
                  {form.counts.map((count, index) => (
                    <div className="count-editor" key={count.locationCode}>
                      <strong>{count.locationCode}</strong>
                      <input
                        value={count.quantityText}
                        onChange={(event) => updateCount(index, "quantityText", event.target.value)}
                        placeholder="Quantity text"
                      />
                      <input
                        type="number"
                        step="0.001"
                        value={count.quantityValue}
                        onChange={(event) => updateCount(index, "quantityValue", event.target.value)}
                        placeholder="Structured count"
                      />
                      <input value={count.unit} onChange={(event) => updateCount(index, "unit", event.target.value)} placeholder="Unit" />
                    </div>
                  ))}

                  {message ? <p className="status-message status-message--ok">{message}</p> : null}
                  {error ? <p className="status-message status-message--error">{error}</p> : null}
                  <button type="submit" disabled={saving}>
                    {saving ? "Saving..." : "Save item"}
                  </button>
                </form>
              ) : (
                <section className="panel prose">
                  <dl className="metadata-list">
                    <div>
                      <dt>Reference</dt>
                      <dd>{item.reference || "N/A"}</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{item.source}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{item.status}</dd>
                    </div>
                  </dl>
                  <p>{item.description}</p>
                  <p>{item.utility}</p>
                </section>
              )}
            </div>
          </div>
        )}
      </StatusMessage>
    </section>
  );
}
