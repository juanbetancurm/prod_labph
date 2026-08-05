import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

import ijrLogo from '../../../IJRLogo.webp';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isLocationsPage = location.pathname === "/locations";

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/locations">
          <img className='brand__logo' src={ijrLogo} alt='IJR logo' />
          Physics Lab Inventory
        </NavLink>
        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/inventory">Inventory</NavLink>
          <NavLink to="/locations">Locations</NavLink>
          <NavLink to="/review">Review</NavLink>
        </nav>
        <div className="auth-area">
          {user ? (
            <>
              <span>{user.name || user.email}</span>
              <button className="button button--secondary" type="button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <NavLink className="button" to="/login">
              Teacher login
            </NavLink>
          )}
        </div>
      </header>
      <main className={"page-frame" + (isLocationsPage ? " page-frame--locations" : "")}>
        <Outlet />
      </main>
    </div>
  );
}
