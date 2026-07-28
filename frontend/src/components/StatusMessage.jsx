export function StatusMessage({ error, loading, empty, children }) {
  if (loading) {
    return <p className="status-message">Loading...</p>;
  }

  if (error) {
    return <p className="status-message status-message--error">{error}</p>;
  }

  if (empty) {
    return <p className="status-message">{empty}</p>;
  }

  return children;
}
