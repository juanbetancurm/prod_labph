import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StatusMessage } from "../components/StatusMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

export function ReviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [locationCode, setLocationCode] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoading(true);
    Promise.all([api.locations(), api.auditSessions()])
      .then(([locationData, sessionData]) => {
        setLocations(locationData.locations);
        setLocationCode(locationData.locations.find((location) => location.code === "BlueShelf")?.code || locationData.locations[0]?.code || "");
        setSessions(sessionData.sessions);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [user]);

  async function startReview() {
    setStarting(true);
    setError("");

    try {
      const data = await api.createAuditSession({ locationCode });
      navigate(`/audit/${data.session.id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setStarting(false);
    }
  }

  if (!user) {
    return (
      <section className="narrow-page stack">
        <div className="page-heading">
          <p className="eyebrow">Teacher access</p>
          <h1>Photo review</h1>
        </div>
        <div className="panel">
          <p>Login is required to create review sessions and approve corrections.</p>
          <Link className="button" to="/login">
            Teacher login
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="page-heading">
        <p className="eyebrow">Photo-first count correction</p>
        <h1>Review inventory</h1>
      </div>

      <StatusMessage loading={loading} error={error}>
        <section className="panel form-grid">
          <label>
            Location
            <select value={locationCode} onChange={(event) => setLocationCode(event.target.value)}>
              {locations.map((location) => (
                <option key={location.code} value={location.code}>
                  {location.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={startReview} disabled={!locationCode || starting}>
            {starting ? "Starting..." : "Start review"}
          </button>
        </section>

        <section className="panel">
          <div className="section-title">
            <h2>Recent review sessions</h2>
          </div>
          {sessions.length ? (
            <div className="session-list">
              {sessions.map((session) => (
                <Link className="session-row" to={`/audit/${session.id}`} key={session.id}>
                  <span>{session.location?.label || session.locationCode}</span>
                  <strong>{session.status}</strong>
                  <time>{new Date(session.createdAt).toLocaleString()}</time>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">No review sessions yet.</p>
          )}
        </section>
      </StatusMessage>
    </section>
  );
}
