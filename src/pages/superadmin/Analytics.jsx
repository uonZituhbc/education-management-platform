import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import "./Analytics.css";

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    institutions: [],
    students: [],
    staff: [],
    programmes: [],
    academicUnits: [],
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    setError("");

    try {
      const [
        institutionsResult,
        studentsResult,
        staffResult,
        programmesResult,
        academicUnitsResult,
      ] = await Promise.all([
        supabase
          .from("institutions")
          .select("id, name, institution_type, is_active, created_at"),

        supabase
          .from("students")
          .select("id, institution_id, status, created_at"),

        supabase
          .from("staff")
          .select("id, institution_id, is_active, created_at"),

        supabase
          .from("programmes")
          .select("id, institution_id, created_at"),

        supabase
          .from("academic_units")
          .select("id, institution_id, is_active, created_at"),
      ]);

      const results = [
        institutionsResult,
        studentsResult,
        staffResult,
        programmesResult,
        academicUnitsResult,
      ];

      const failed = results.find((result) => result.error);

      if (failed) {
        throw failed.error;
      }

      setData({
        institutions: institutionsResult.data || [],
        students: studentsResult.data || [],
        staff: staffResult.data || [],
        programmes: programmesResult.data || [],
        academicUnits: academicUnitsResult.data || [],
      });
    } catch (err) {
      console.error("Analytics error:", err);
      setError(err.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const activeInstitutions = data.institutions.filter(
      (institution) => institution.is_active
    ).length;

    const inactiveInstitutions =
      data.institutions.length - activeInstitutions;

    const activeStudents = data.students.filter(
      (student) =>
        student.status !== "inactive" &&
        student.status !== "withdrawn"
    ).length;

    const activeStaff = data.staff.filter(
      (staff) => staff.is_active !== false
    ).length;

    const activeAcademicUnits = data.academicUnits.filter(
      (unit) => unit.is_active !== false
    ).length;

    return {
      totalInstitutions: data.institutions.length,
      activeInstitutions,
      inactiveInstitutions,
      totalStudents: data.students.length,
      activeStudents,
      totalStaff: data.staff.length,
      activeStaff,
      totalProgrammes: data.programmes.length,
      totalAcademicUnits: data.academicUnits.length,
      activeAcademicUnits,
    };
  }, [data]);

  const institutionTypes = useMemo(() => {
    const counts = {};

    data.institutions.forEach((institution) => {
      const type = institution.institution_type || "other";

      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [data.institutions]);

  const institutionPerformance = useMemo(() => {
    return data.institutions
      .map((institution) => {
        const students = data.students.filter(
          (student) => student.institution_id === institution.id
        ).length;

        const staff = data.staff.filter(
          (staffMember) => staffMember.institution_id === institution.id
        ).length;

        const programmes = data.programmes.filter(
          (programme) => programme.institution_id === institution.id
        ).length;

        const academicUnits = data.academicUnits.filter(
          (unit) => unit.institution_id === institution.id
        ).length;

        return {
          ...institution,
          students,
          staff,
          programmes,
          academicUnits,
        };
      })
      .sort((a, b) => b.students - a.students);
  }, [data]);

  function formatType(type) {
    if (!type) return "Other";

    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="superadmin-analytics-page">
        <div className="analytics-loading">
          <div className="analytics-spinner"></div>
          <p>Loading platform analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-analytics-page">
      <div className="analytics-header">
        <div>
          <span className="analytics-eyebrow">
            PLATFORM INTELLIGENCE
          </span>

          <h1>Analytics</h1>

          <p>
            Monitor the growth, activity and structure of the entire
            education platform.
          </p>
        </div>

        <button
          type="button"
          className="analytics-refresh-button"
          onClick={loadAnalytics}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="analytics-error">
          <strong>Unable to load analytics</strong>
          <span>{error}</span>
        </div>
      )}

      <section className="analytics-stat-grid">
        <div className="analytics-stat-card">
          <div className="analytics-stat-icon blue">🏫</div>
          <div>
            <span>Total Institutions</span>
            <strong>{stats.totalInstitutions}</strong>
            <small>
              {stats.activeInstitutions} active
            </small>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon green">🎓</div>
          <div>
            <span>Total Students</span>
            <strong>{stats.totalStudents}</strong>
            <small>
              {stats.activeStudents} active
            </small>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon purple">👨‍🏫</div>
          <div>
            <span>Total Staff</span>
            <strong>{stats.totalStaff}</strong>
            <small>
              {stats.activeStaff} active
            </small>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon orange">📚</div>
          <div>
            <span>Programmes</span>
            <strong>{stats.totalProgrammes}</strong>
            <small>Across all institutions</small>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon teal">📖</div>
          <div>
            <span>Academic Units</span>
            <strong>{stats.totalAcademicUnits}</strong>
            <small>
              {stats.activeAcademicUnits} active
            </small>
          </div>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-icon red">⚡</div>
          <div>
            <span>Platform Status</span>
            <strong>Active</strong>
            <small>System operational</small>
          </div>
        </div>
      </section>

      <section className="analytics-main-grid">
        <div className="analytics-panel">
          <div className="analytics-panel-header">
            <div>
              <h2>Institutions by Type</h2>
              <p>Distribution of registered institutions.</p>
            </div>
          </div>

          {institutionTypes.length === 0 ? (
            <div className="analytics-empty">
              No institution data available.
            </div>
          ) : (
            <div className="institution-type-list">
              {institutionTypes.map(([type, count]) => {
                const percentage =
                  stats.totalInstitutions > 0
                    ? (count / stats.totalInstitutions) * 100
                    : 0;

                return (
                  <div
                    className="institution-type-row"
                    key={type}
                  >
                    <div className="institution-type-info">
                      <span>{formatType(type)}</span>
                      <strong>{count}</strong>
                    </div>

                    <div className="analytics-progress">
                      <div
                        className="analytics-progress-fill"
                        style={{
                          width: `${percentage}%`,
                        }}
                      ></div>
                    </div>

                    <small>
                      {percentage.toFixed(1)}%
                    </small>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="analytics-panel">
          <div className="analytics-panel-header">
            <div>
              <h2>Institution Status</h2>
              <p>Current platform institution activity.</p>
            </div>
          </div>

          <div className="status-overview">
            <div className="status-circle">
              <strong>{stats.activeInstitutions}</strong>
              <span>Active</span>
            </div>

            <div className="status-details">
              <div>
                <span className="status-dot active"></span>
                <span>Active Institutions</span>
                <strong>{stats.activeInstitutions}</strong>
              </div>

              <div>
                <span className="status-dot inactive"></span>
                <span>Inactive Institutions</span>
                <strong>{stats.inactiveInstitutions}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="analytics-panel institutions-performance-panel">
        <div className="analytics-panel-header">
          <div>
            <h2>Institution Performance</h2>
            <p>
              Overview of users and academic structures by institution.
            </p>
          </div>
        </div>

        {institutionPerformance.length === 0 ? (
          <div className="analytics-empty">
            No institutions have been registered yet.
          </div>
        ) : (
          <div className="analytics-table-wrapper">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Type</th>
                  <th>Students</th>
                  <th>Staff</th>
                  <th>Programmes</th>
                  <th>Units</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>

              <tbody>
                {institutionPerformance.map((institution) => (
                  <tr key={institution.id}>
                    <td>
                      <div className="institution-name-cell">
                        <div className="institution-mini-avatar">
                          {institution.name
                            ? institution.name
                                .substring(0, 2)
                                .toUpperCase()
                            : "IN"}
                        </div>

                        <strong>{institution.name}</strong>
                      </div>
                    </td>

                    <td>{formatType(institution.institution_type)}</td>

                    <td>
                      <strong>{institution.students}</strong>
                    </td>

                    <td>{institution.staff}</td>

                    <td>{institution.programmes}</td>

                    <td>{institution.academicUnits}</td>

                    <td>
                      <span
                        className={`analytics-status ${
                          institution.is_active
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {institution.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td>{formatDate(institution.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="analytics-bottom-grid">
        <div className="analytics-summary-card">
          <span>Student to Staff Ratio</span>

          <strong>
            {stats.totalStaff > 0
              ? `${(
                  stats.totalStudents / stats.totalStaff
                ).toFixed(1)} : 1`
              : "—"}
          </strong>

          <p>
            Average number of students represented per staff
            member across the platform.
          </p>
        </div>

        <div className="analytics-summary-card">
          <span>Programmes per Institution</span>

          <strong>
            {stats.totalInstitutions > 0
              ? (
                  stats.totalProgrammes /
                  stats.totalInstitutions
                ).toFixed(1)
              : "—"}
          </strong>

          <p>
            Average number of programmes registered by each
            institution.
          </p>
        </div>

        <div className="analytics-summary-card">
          <span>Academic Units per Institution</span>

          <strong>
            {stats.totalInstitutions > 0
              ? (
                  stats.totalAcademicUnits /
                  stats.totalInstitutions
                ).toFixed(1)
              : "—"}
          </strong>

          <p>
            Average academic units currently registered across
            institutions.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Analytics;