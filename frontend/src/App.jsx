import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { AuditSessionPage } from "./pages/AuditSessionPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { InventoryPage } from "./pages/InventoryPage.jsx";
import { ItemDetailPage } from "./pages/ItemDetailPage.jsx";
import { LocationPage } from "./pages/LocationPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { ReviewPage } from "./pages/ReviewPage.jsx";

function RequireTeacher({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="status-message">Loading...</p>;
  }

  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inventory/:id" element={<ItemDetailPage />} />
        <Route path="locations" element={<LocationPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route
          path="audit/:id"
          element={
            <RequireTeacher>
              <AuditSessionPage />
            </RequireTeacher>
          }
        />
        <Route path="login" element={<LoginPage />} />
      </Route>
    </Routes>
  );
}
