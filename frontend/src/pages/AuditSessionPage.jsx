import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { api } from "../lib/api.js";
import { needsApproval } from "../lib/format.js";

const statuses = [
  ["uncertain", "Uncertain"],
  ["found", "Found"],
  ["missing", "Missing"],
  ["count_corrected", "Count corrected"],
];

function AuditEntryForm({ entry, onSaved }) {
  const [form, setForm] = useState({
    status: entry.status || "uncertain",
    observedQuantityText: entry.observedQuantityText || "",
    proposedQuantityText: entry.proposedQuantityText || "",
    notes: entry.notes || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      status: entry.status || "uncertain",
      observedQuantityText: entry.observedQuantityText || "",
      proposedQuantityText: entry.proposedQuantityText || "",
      notes: entry.notes || "",
    });
  }, [entry]);

  async function save() {
    setSaving(true);
    try {
      await api.updateAuditEntry(entry.id, form);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="audit-entry">
      <div>
        <strong>{entry.item?.name || entry.extraItemName || "Extra item"}</strong>
        <p className="muted">Expected: {entry.expectedQuantityText || "not listed"}</p>
      </div>
      <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
        {statuses.map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        value={form.observedQuantityText}
        onChange={(event) => setForm((current) => ({ ...current, observedQuantityText: event.target.value }))}
        placeholder="Observed count"
      />
      <input
        value={form.proposedQuantityText}
        onChange={(event) => setForm((current) => ({ ...current, proposedQuantityText: event.target.value }))}
        placeholder="Approved count text"
      />
      <input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" />
      <button className="button button--secondary" type="button" onClick={save} disabled={saving}>
        Save
      </button>
    </div>
  );
}

function ExtraItemForm({ sessionId, photoId, onCreated }) {
  const [extraItemName, setExtraItemName] = useState("");
  const [observedQuantityText, setObservedQuantityText] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function createExtra(event) {
    event.preventDefault();
    if (!extraItemName.trim()) {
      return;
    }

    setSaving(true);
    try {
      await api.createAuditEntry(sessionId, {
        photoId,
        status: "extra",
        extraItemName,
        observedQuantityText,
        notes,
      });
      setExtraItemName("");
      setObservedQuantityText("1");
      setNotes("");
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="extra-form" onSubmit={createExtra}>
      <input value={extraItemName} onChange={(event) => setExtraItemName(event.target.value)} placeholder="Extra item seen in photo" />
      <input value={observedQuantityText} onChange={(event) => setObservedQuantityText(event.target.value)} placeholder="Count" />
      <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" />
      <button className="button button--secondary" type="submit" disabled={saving}>
        Add extra
      </button>
    </form>
  );
}

export function AuditSessionPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadSession = useCallback(async () => {
    setError("");
    const sessionData = await api.auditSession(id);
    setSession(sessionData.session);
    const photoData = await api.photos({ locationCode: sessionData.session.locationCode });
    setPhotos(photoData.photos);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadSession()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [loadSession]);

  const entriesByItem = useMemo(() => {
    return new Map((session?.entries || []).filter((entry) => entry.itemId).map((entry) => [entry.itemId, entry]));
  }, [session]);

  const photographedItemIds = useMemo(() => {
    return new Set(photos.flatMap((photo) => photo.items.map((item) => item.id)));
  }, [photos]);

  const unphotographedEntries = (session?.entries || []).filter((entry) => entry.itemId && !photographedItemIds.has(entry.itemId));
  const proposedChanges = (session?.entries || []).filter(needsApproval);

  async function runAction(action) {
    setActionMessage("");
    setError("");

    try {
      const data = await action(session.id);
      setSession(data.session);
      setActionMessage("Session updated.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="stack">
      <Link to="/review" className="text-link">
        Back to review sessions
      </Link>

      <StatusMessage loading={loading} error={error && !session ? error : ""}>
        {session && (
          <>
            <div className="page-heading">
              <p className="eyebrow">Audit session: {session.status}</p>
              <h1>{session.location?.label || session.locationCode}</h1>
              <p className="muted">{session.entries.length} expected item checks</p>
            </div>

            <div className="toolbar">
              <button type="button" disabled={session.status !== "draft"} onClick={() => runAction(api.submitAuditSession)}>
                Submit review
              </button>
              <button
                className="button button--secondary"
                type="button"
                disabled={session.status !== "submitted"}
                onClick={() => runAction(api.approveAuditSession)}
              >
                Approve corrections
              </button>
              {actionMessage ? <span className="status-message status-message--ok">{actionMessage}</span> : null}
              {error ? <span className="status-message status-message--error">{error}</span> : null}
            </div>

            <section className="panel">
              <div className="section-title">
                <h2>Proposed approval changes</h2>
                <span>{proposedChanges.length}</span>
              </div>
              {proposedChanges.length ? (
                <div className="change-list">
                  {proposedChanges.map((entry) => (
                    <article className="change-row" key={entry.id}>
                      <div>
                        <strong>{entry.item?.name || entry.extraItemName || "Extra item"}</strong>
                        <p>
                          {entry.status} - expected {entry.expectedQuantityText || "N/A"} - proposed{" "}
                          {entry.proposedQuantityText || entry.observedQuantityText || "no count change"}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">No count corrections or extras have been proposed.</p>
              )}
            </section>

            <div className="photo-review-list">
              {photos.map((photo) => (
                <section className="photo-review" key={photo.id}>
                  <a className="review-photo" href={photo.publicPath} target="_blank" rel="noreferrer">
                    <img src={photo.publicPath} alt="" loading="lazy" />
                  </a>
                  <div className="review-photo__items">
                    <div className="section-title">
                      <h2>{photo.originalFilename}</h2>
                      <span>{photo.items.length} linked expected items</span>
                    </div>
                    {photo.items.length ? (
                      photo.items.map((item) => {
                        const entry = entriesByItem.get(item.id);
                        return entry ? <AuditEntryForm entry={entry} onSaved={loadSession} key={`${photo.id}-${item.id}`} /> : null;
                      })
                    ) : (
                      <p className="muted">No expected items linked to this photo.</p>
                    )}
                    <ExtraItemForm sessionId={session.id} photoId={photo.id} onCreated={loadSession} />
                  </div>
                </section>
              ))}
            </div>

            {unphotographedEntries.length ? (
              <section className="panel stack">
                <div className="section-title">
                  <h2>Expected items without linked photos</h2>
                  <span>{unphotographedEntries.length}</span>
                </div>
                {unphotographedEntries.map((entry) => (
                  <AuditEntryForm entry={entry} onSaved={loadSession} key={entry.id} />
                ))}
              </section>
            ) : null}
          </>
        )}
      </StatusMessage>
    </section>
  );
}




