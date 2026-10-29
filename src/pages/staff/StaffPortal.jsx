import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

function StaffPortal() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState(null);
  const [institution, setInstitution] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStaffPortal();
  }, []);

  async function loadStaffPortal() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: staffData, error: staffError } =
        await supabase
          .from("staff")
          .select(
            `
              id,
              institution_id,
              department_id,
              staff_number,
              full_name,
              email,
              phone,
              staff_role,
              account_status,
              is_active,
              department:departments (
                id,
                name,
                code
              )
            `
          )
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

      if (staffError) {
        throw staffError;
      }

      if (!staffData) {
        setError(
          "Your staff account could not be found. Please contact your institution administrator."
        );
        setLoading(false);
        return;
      }

      setStaff(staffData);

      const { data: institutionData, error: institutionError } =
        await supabase
          .from("institutions")
          .select(
            `
              id,
              name,
              institution_type,
              email,
              phone,
              address,
              logo_url
            `
          )
          .eq("id", staffData.institution_id)
          .maybeSingle();

      if (institutionError) {
        throw institutionError;
      }

      setInstitution(institutionData);

      const { data: assignmentData, error: assignmentError } =
        await supabase
          .from("staff_teaching_assignments")
          .select(
            `
              id,
              academic_year,
              term,
              is_active,
              department:departments (
                id,
                name,
                code
              ),
              programme:programmes (
                id,
                name,
                code
              ),
              academic_unit:academic_units (
                id,
                name,
                code,
                unit_type
              ),
              class:classes (
                id,
                name,
                academic_year,
                term
              )
            `
          )
          .eq("staff_id", staffData.id)
          .eq("is_active", true)
          .order("created_at", {
            ascending: false,
          });

      if (assignmentError) {
        throw assignmentError;
      }

      setAssignments(assignmentData || []);
    } catch (err) {
      console.error("Staff portal error:", err);

      setError(
        err.message ||
          "Unable to load your staff portal."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  function formatRole(role) {
    if (!role) return "Staff";

    return role
      .split("_")
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");
  }

  if (loading) {
    return (
      <div className="staff-portal-loading">
        <div className="staff-portal-spinner"></div>
        <p>Loading your staff portal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="staff-portal-error-page">
        <div className="staff-portal-error-card">
          <div className="staff-portal-error-icon">
            !
          </div>

          <h1>Staff Portal</h1>

          <p>{error}</p>

          <button
            type="button"
            onClick={() => navigate("/login")}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-portal">

      {/* Sidebar */}
      <aside className="staff-portal-sidebar">

        <div className="staff-portal-brand">
          <div className="staff-portal-logo">
            EMP
          </div>

          <div>
            <h2>Education Management</h2>
            <span>Staff Portal</span>
          </div>
        </div>

        <nav className="staff-portal-nav">

          <button
            type="button"
            className="staff-portal-nav-item active"
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            type="button"
            className="staff-portal-nav-item"
          >
            <span>👤</span>
            My Profile
          </button>

          <button
            type="button"
            className="staff-portal-nav-item"
          >
            <span>📚</span>
            My Assignments
          </button>

          <button
            type="button"
            className="staff-portal-nav-item"
          >
            <span>🏫</span>
            My Classes
          </button>

          <button
            type="button"
            className="staff-portal-nav-item"
          >
            <span>📖</span>
            My Units
          </button>

          <button
            type="button"
            className="staff-portal-nav-item"
          >
            <span>📝</span>
            Results
          </button>

          <button
            type="button"
            className="staff-portal-nav-item"
          >
            <span>⚙️</span>
            Settings
          </button>

        </nav>

        <button
          type="button"
          className="staff-portal-logout"
          onClick={handleLogout}
        >
          <span>↪</span>
          Logout
        </button>

      </aside>

      {/* Main Content */}
      <main className="staff-portal-main">

        {/* Topbar */}
        <header className="staff-portal-topbar">

          <div>
            <h1>Staff Dashboard</h1>

            <p>
              Welcome back, {staff?.full_name}
            </p>
          </div>

          <div className="staff-portal-user">

            <div className="staff-portal-avatar">
              {staff?.full_name
                ?.charAt(0)
                ?.toUpperCase()}
            </div>

            <div>
              <strong>{staff?.full_name}</strong>
              <span>
                {formatRole(staff?.staff_role)}
              </span>
            </div>

          </div>

        </header>

        {/* Institution Banner */}
        <section className="staff-portal-institution">

          <div className="staff-portal-institution-logo">
            {institution?.logo_url ? (
              <img
                src={institution.logo_url}
                alt={institution.name}
              />
            ) : (
              "🏫"
            )}
          </div>

          <div>
            <h2>
              {institution?.name || "Institution"}
            </h2>

            <p>
              {formatRole(staff?.staff_role)}
              {staff?.department?.name
                ? ` • ${staff.department.name}`
                : ""}
            </p>
          </div>

        </section>

        {/* Statistics */}
        <section className="staff-portal-stats">

          <div className="staff-portal-stat-card">
            <div className="staff-portal-stat-icon">
              📚
            </div>

            <div>
              <span>Teaching Assignments</span>
              <strong>{assignments.length}</strong>
            </div>
          </div>

          <div className="staff-portal-stat-card">
            <div className="staff-portal-stat-icon">
              🏫
            </div>

            <div>
              <span>Classes</span>
              <strong>
                {
                  new Set(
                    assignments
                      .map((item) => item.class?.id)
                      .filter(Boolean)
                  ).size
                }
              </strong>
            </div>
          </div>

          <div className="staff-portal-stat-card">
            <div className="staff-portal-stat-icon">
              📖
            </div>

            <div>
              <span>Academic Units</span>
              <strong>
                {
                  new Set(
                    assignments
                      .map(
                        (item) =>
                          item.academic_unit?.id
                      )
                      .filter(Boolean)
                  ).size
                }
              </strong>
            </div>
          </div>

          <div className="staff-portal-stat-card">
            <div className="staff-portal-stat-icon">
              ✓
            </div>

            <div>
              <span>Account Status</span>
              <strong>
                {staff?.account_status || "Active"}
              </strong>
            </div>
          </div>

        </section>

        {/* Teaching Assignments */}
        <section className="staff-portal-section">

          <div className="staff-portal-section-header">

            <div>
              <h2>My Teaching Assignments</h2>

              <p>
                Academic units and classes assigned
                to you.
              </p>
            </div>

            <button
              type="button"
              onClick={loadStaffPortal}
              className="staff-portal-refresh"
            >
              ↻ Refresh
            </button>

          </div>

          {assignments.length === 0 ? (
            <div className="staff-portal-empty">
              <div>📚</div>

              <h3>No Teaching Assignments</h3>

              <p>
                Your institution administrator has
                not assigned any teaching units to
                your account yet.
              </p>
            </div>
          ) : (
            <div className="staff-portal-assignment-grid">

              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="staff-portal-assignment-card"
                >

                  <div className="staff-portal-assignment-header">

                    <span className="staff-portal-unit-code">
                      {assignment.academic_unit?.code ||
                        "UNIT"}
                    </span>

                    <span className="staff-portal-active">
                      Active
                    </span>

                  </div>

                  <h3>
                    {assignment.academic_unit?.name ||
                      "Academic Unit"}
                  </h3>

                  <div className="staff-portal-assignment-details">

                    <div>
                      <span>Class</span>
                      <strong>
                        {assignment.class?.name ||
                          "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>Programme</span>
                      <strong>
                        {assignment.programme?.name ||
                          "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>Department</span>
                      <strong>
                        {assignment.department?.name ||
                          "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>Academic Year</span>
                      <strong>
                        {assignment.academic_year ||
                          assignment.class?.academic_year ||
                          "Not specified"}
                      </strong>
                    </div>

                    <div>
                      <span>Term</span>
                      <strong>
                        {assignment.term ||
                          assignment.class?.term ||
                          "Not specified"}
                      </strong>
                    </div>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

      </main>
    </div>
  );
}

export default StaffPortal;