import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./SuperAdminLayout.css";

const SuperAdminLayout = () => {
  return (
    <div className="superadmin-layout">
      <aside className="superadmin-sidebar">
        <div className="superadmin-brand">
          <div className="superadmin-brand-icon">👑</div>
          <div>
            <h2>EMP</h2>
            <span>Super Admin</span>
          </div>
        </div>

        <nav className="superadmin-nav">
          <NavLink
            to="/dashboard/super-admin"
            end
            className={({ isActive }) =>
              `superadmin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span>🏠</span>
            Dashboard
          </NavLink>

          <div className="superadmin-section-title">
            PLATFORM
          </div>

          <NavLink
            to="/dashboard/super-admin/institutions"
            className={({ isActive }) =>
              `superadmin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span>🏢</span>
            Institutions
          </NavLink>

          <NavLink
            to="/dashboard/super-admin/users"
            className={({ isActive }) =>
              `superadmin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span>👥</span>
            Users
          </NavLink>

          <NavLink
            to="/dashboard/super-admin/analytics"
            className={({ isActive }) =>
              `superadmin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span>📊</span>
            Analytics
          </NavLink>

          <NavLink
            to="/dashboard/super-admin/activity"
            className={({ isActive }) =>
              `superadmin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span>📋</span>
            Activity Logs
          </NavLink>

          <NavLink
            to="/dashboard/super-admin/support-tickets"
            className={({ isActive }) =>
              `superadmin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span>🎫</span>
            Support Tickets
          </NavLink>

          <div className="superadmin-section-title">
            SYSTEM
          </div>

          <NavLink
            to="/dashboard/super-admin/settings"
            className={({ isActive }) =>
              `superadmin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <span>⚙️</span>
            Platform Settings
          </NavLink>
        </nav>

        <div className="superadmin-sidebar-footer">
          <div className="superadmin-admin-profile">
            <div className="superadmin-avatar">C</div>

            <div>
              <strong>Charles Ouma</strong>
              <small>Super Admin</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="superadmin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default SuperAdminLayout;