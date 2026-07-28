import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (user) {
    return <Navigate to="/review" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await login(email, password);
      navigate("/review");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="narrow-page stack">
      <div className="page-heading">
        <p className="eyebrow">Teacher access</p>
        <h1>Login</h1>
      </div>
      <form className="panel form-grid" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error ? <p className="status-message status-message--error">{error}</p> : null}
        <button type="submit" disabled={saving}>
          {saving ? "Signing in..." : "Login"}
        </button>
      </form>
    </section>
  );
}
