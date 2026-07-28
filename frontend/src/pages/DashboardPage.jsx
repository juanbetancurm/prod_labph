import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { api } from "../lib/api.js";

export function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .dashboard()
      .then(setDashboard)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="stack">
      <div className="page-heading">
        <p className="eyebrow">Inventory control</p>
        <h1>Dashboard</h1>
      </div>

      <StatusMessage loading={loading} error={error}>
        {dashboard && (
          <>
            <div className="metric-grid">
              <Link className="metric-card" to="/inventory">
                <span>Items</span>
                <strong>{dashboard.itemCount}</strong>
              </Link>
              <Link className="metric-card" to="/locations">
                <span>Locations</span>
                <strong>{dashboard.locationCount}</strong>
              </Link>
              <Link className="metric-card" to="/review">
                <span>Open reviews</span>
                <strong>{dashboard.unresolvedReviewCount}</strong>
              </Link>
            </div>

            <section className="panel">
              <div className="section-title">
                <h2>Recent changes</h2>
                <Link to="/review">Review sessions</Link>
              </div>
              {dashboard.recentChanges.length ? (
                <div className="change-list">
                  {dashboard.recentChanges.map((change) => (
                    <article className="change-row" key={change.id}>
                      <div>
                        <strong>{change.changeType.replaceAll("_", " ")}</strong>
                        <p>
                          {change.item?.name || change.after?.extraItemName || "Inventory update"}
                          {change.location ? ` - ${change.location.label}` : ""}
                        </p>
                      </div>
                      <time>{new Date(change.createdAt).toLocaleString()}</time>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">No approved changes yet.</p>
              )}
            </section>
          </>
        )}
      </StatusMessage>
    </section>
  );
}
