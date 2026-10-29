import React, { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import "./SuperAdminDashboard.css";

const SuperAdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    institutions: 0,
    activeInstitutions: 0,
    users: 0,
    students: 0,
    staff: 0,
    programmes: 0,
    academicUnits: 0,
  });

  const [recentInstitutions, setRecentInstitutions] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("You must be logged in.");
      }

      // Verify Super Admin
      const { data: superAdmin, error: superAdminError } = await supabase
        .from("super_admins")
        .select("id, full_name, email, is_active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (superAdminError) throw superAdminError;

      if (!superAdmin) {
        throw new Error("Access denied. This account is not a Super Admin.");
      }

      if (!superAdmin.is_active) {
        throw new Error("Your Super Admin account is currently inactive.");
      }

      // Institutions
      const { count: institutionCount, error: institutionError } =
        await supabase
          .from("institutions")
          .select("*", { count: "exact", head: true });

      if (institutionError) throw institutionError;

      // Active institutions
      const { count: activeInstitutionCount, error: activeError } =
        await supabase
          .from("institutions")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

      if (activeError) throw activeError;

      // Institution members
      const { count: userCount, error: userCountError } = await supabase
        .from("institution_members")
        .select("*", { count: "exact", head: true });

      if (userCountError) throw userCountError;

      // Students
      const { count: studentCount, error: studentError } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      if (studentError) throw studentError;

      // Staff
      const { count: staffCount, error: staffError } = await supabase
        .from("staff")
        .select("*", { count: "exact", head: true });

      if (staffError) throw staffError;

      // Programmes
      const { count: programmeCount, error: programmeError } =
        await supabase
          .from("programmes")
          .select("*", { count: "exact", head: true });

      if (programmeError) throw programmeError;

      // Academic Units
      const { count: academicUnitCount, error: academicUnitError } =
        await supabase
          .from("academic_units")
          .select("*", { count: "exact", head: true });

      if (academicUnitError) throw academicUnitError;

      // Recent institutions
      const { data: institutions, error: recentError } = await supabase
        .from("institutions")
        .select(
          "id, name, institution_type, email, phone, is_active, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      setStats({
        institutions: institutionCount || 0,
        activeInstitutions: activeInstitutionCount || 0,
        users: userCount || 0,
        students: studentCount || 0,
        staff: staffCount || 0,
        programmes: programmeCount || 0,
        academicUnits: academicUnitCount || 0,
      });

      setRecentInstitutions(institutions || []);
    } catch (err) {
      console.error("Super Admin Dashboard Error:", err);
      setError(err.message || "Failed to load Super Admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="superadmin-loading">
        <div className="superadmin-spinner"></div>
        <p>Loading Super Admin Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="superadmin-error-page">
        <div className="superadmin-error-card">
          <div className="superadmin-error-icon">⚠️</div>

          <h2>Unable to Load Dashboard</h2>

          <p>{error}</p>

          <button onClick={loadDashboard}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-page">
      {/* Header */}
      <div className="superadmin-header">
        <div>
          <span className="superadmin-label">EMP CONTROL CENTER</span>

          <h1>Super Admin Dashboard</h1>

          <p>
            Manage and monitor the entire Education Management Platform.
          </p>
        </div>

        <div className="superadmin-badge">
          <span>👑</span>
          Super Admin
        </div>
      </div>

      {/* Statistics */}
      <div className="superadmin-stats">
        <div className="superadmin-stat-card">
          <div className="stat-icon">🏢</div>

          <div>
            <span>Total Institutions</span>
            <strong>{stats.institutions}</strong>
          </div>
        </div>

        <div className="superadmin-stat-card">
          <div className="stat-icon">🟢</div>

          <div>
            <span>Active Institutions</span>
            <strong>{stats.activeInstitutions}</strong>
          </div>
        </div>

        <div className="superadmin-stat-card">
          <div className="stat-icon">👥</div>

          <div>
            <span>Institution Users</span>
            <strong>{stats.users}</strong>
          </div>
        </div>

        <div className="superadmin-stat-card">
          <div className="stat-icon">🎓</div>

          <div>
            <span>Students</span>
            <strong>{stats.students}</strong>
          </div>
        </div>

        <div className="superadmin-stat-card">
          <div className="stat-icon">👨‍🏫</div>

          <div>
            <span>Staff</span>
            <strong>{stats.staff}</strong>
          </div>
        </div>

        <div className="superadmin-stat-card">
          <div className="stat-icon">📚</div>

          <div>
            <span>Programmes</span>
            <strong>{stats.programmes}</strong>
          </div>
        </div>

        <div className="superadmin-stat-card">
          <div className="stat-icon">📖</div>

          <div>
            <span>Academic Units</span>
            <strong>{stats.academicUnits}</strong>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="superadmin-content-grid">
        {/* Recent Institutions */}
        <section className="superadmin-panel">
          <div className="panel-header">
            <div>
              <h2>Recent Institutions</h2>
              <p>Latest institutions registered on EMP.</p>
            </div>

            <button
              className="panel-action"
              onClick={() => {
                window.location.href = "/dashboard/super-admin/institutions";
              }}
            >
              View All
            </button>
          </div>

          {recentInstitutions.length === 0 ? (
            <div className="empty-state">
              <div>🏢</div>
              <p>No institutions registered yet.</p>
            </div>
          ) : (
            <div className="institutions-list">
              {recentInstitutions.map((institution) => (
                <div
                  className="institution-row"
                  key={institution.id}
                >
                  <div className="institution-avatar">
                    {institution.name?.charAt(0)?.toUpperCase() || "I"}
                  </div>

                  <div className="institution-info">
                    <h3>{institution.name}</h3>

                    <p>
                      {institution.institution_type || "Institution"}
                    </p>

                    <small>
                      Registered {formatDate(institution.created_at)}
                    </small>
                  </div>

                  <span
                    className={
                      institution.is_active
                        ? "status active"
                        : "status inactive"
                    }
                  >
                    {institution.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Platform Overview */}
        <section className="superadmin-panel">
          <div className="panel-header">
            <div>
              <h2>Platform Overview</h2>
              <p>Current EMP ecosystem.</p>
            </div>
          </div>

          <div className="overview-list">
            <div className="overview-item">
              <span>Institutions</span>
              <strong>{stats.institutions}</strong>
            </div>

            <div className="overview-item">
              <span>Students</span>
              <strong>{stats.students}</strong>
            </div>

            <div className="overview-item">
              <span>Staff</span>
              <strong>{stats.staff}</strong>
            </div>

            <div className="overview-item">
              <span>Programmes</span>
              <strong>{stats.programmes}</strong>
            </div>

            <div className="overview-item">
              <span>Academic Units</span>
              <strong>{stats.academicUnits}</strong>
            </div>
          </div>
        </section>
      </div>

      {/* Quick Actions */}
      <section className="superadmin-panel quick-actions-panel">
        <div className="panel-header">
          <div>
            <h2>Quick Actions</h2>
            <p>Common Super Admin operations.</p>
          </div>
        </div>

        <div className="quick-actions">
          <button
            onClick={() =>
              (window.location.href =
                "/dashboard/super-admin/institutions")
            }
          >
            <span>🏢</span>
            <div>
              <strong>Manage Institutions</strong>
              <small>View and manage all institutions</small>
            </div>
          </button>

          <button
            onClick={() =>
              (window.location.href =
                "/dashboard/super-admin/users")
            }
          >
            <span>👥</span>
            <div>
              <strong>Platform Users</strong>
              <small>Manage users across EMP</small>
            </div>
          </button>

          <button
            onClick={() =>
              (window.location.href =
                "/dashboard/super-admin/settings")
            }
          >
            <span>⚙️</span>
            <div>
              <strong>System Settings</strong>
              <small>Configure platform settings</small>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
};

export default SuperAdminDashboard;