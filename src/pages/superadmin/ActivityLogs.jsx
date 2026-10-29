import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import "./ActivityLogs.css";

function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          id,
          user_id,
          institution_id,
          action,
          entity_type,
          entity_id,
          description,
          metadata,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        throw error;
      }

      setLogs(data || []);
    } catch (err) {
      console.error("Activity logs error:", err);
      setError(err.message || "Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !query ||
        log.description?.toLowerCase().includes(query) ||
        log.action?.toLowerCase().includes(query) ||
        log.entity_type?.toLowerCase().includes(query) ||
        log.user_id?.toLowerCase().includes(query);

      const matchesAction =
        actionFilter === "all" ||
        log.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  const actionTypes = useMemo(() => {
    return [...new Set(logs.map((log) => log.action).filter(Boolean))];
  }, [logs]);

  const stats = useMemo(() => {
    const today = new Date();

    const todayCount = logs.filter((log) => {
      const date = new Date(log.created_at);

      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    }).length;

    const uniqueUsers = new Set(
      logs
        .map((log) => log.user_id)
        .filter(Boolean)
    ).size;

    return {
      total: logs.length,
      today: todayCount,
      users: uniqueUsers,
      actions: actionTypes.length,
    };
  }, [logs, actionTypes]);

  function formatAction(action) {
    if (!action) return "Unknown";

    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatEntity(entity) {
    if (!entity) return "—";

    return entity
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getActionClass(action) {
    if (!action) return "default";

    const value = action.toLowerCase();

    if (
      value.includes("create") ||
      value.includes("add") ||
      value.includes("register")
    ) {
      return "success";
    }

    if (
      value.includes("delete") ||
      value.includes("remove") ||
      value.includes("deactivate")
    ) {
      return "danger";
    }

    if (
      value.includes("update") ||
      value.includes("edit") ||
      value.includes("change")
    ) {
      return "warning";
    }

    if (
      value.includes("login") ||
      value.includes("logout") ||
      value.includes("access")
    ) {
      return "info";
    }

    return "default";
  }

  if (loading) {
    return (
      <div className="superadmin-activity-page">
        <div className="activity-loading">
          <div className="activity-spinner"></div>
          <p>Loading activity logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-activity-page">
      <div className="activity-header">
        <div>
          <span className="activity-eyebrow">
            PLATFORM AUDIT
          </span>

          <h1>Activity Logs</h1>

          <p>
            Monitor important actions performed across the platform.
          </p>
        </div>

        <button
          type="button"
          className="activity-refresh-button"
          onClick={loadLogs}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="activity-error">
          <strong>Unable to load activity logs</strong>
          <span>{error}</span>
        </div>
      )}

      <section className="activity-stat-grid">
        <div className="activity-stat-card">
          <div className="activity-stat-icon blue">
            ◷
          </div>

          <div>
            <span>Total Activities</span>
            <strong>{stats.total}</strong>
            <small>Recorded activities</small>
          </div>
        </div>

        <div className="activity-stat-card">
          <div className="activity-stat-icon green">
            ✓
          </div>

          <div>
            <span>Today's Activities</span>
            <strong>{stats.today}</strong>
            <small>Activities today</small>
          </div>
        </div>

        <div className="activity-stat-card">
          <div className="activity-stat-icon purple">
            👤
          </div>

          <div>
            <span>Active Users</span>
            <strong>{stats.users}</strong>
            <small>Users generating activity</small>
          </div>
        </div>

        <div className="activity-stat-card">
          <div className="activity-stat-icon orange">
            ⚡
          </div>

          <div>
            <span>Action Types</span>
            <strong>{stats.actions}</strong>
            <small>Different actions</small>
          </div>
        </div>
      </section>

      <section className="activity-panel">
        <div className="activity-filters">
          <div className="activity-search">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search activity..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            value={actionFilter}
            onChange={(event) =>
              setActionFilter(event.target.value)
            }
          >
            <option value="all">All Actions</option>

            {actionTypes.map((action) => (
              <option value={action} key={action}>
                {formatAction(action)}
              </option>
            ))}
          </select>
        </div>

        <div className="activity-table-wrapper">
          {filteredLogs.length === 0 ? (
            <div className="activity-empty">
              <div className="activity-empty-icon">
                ◷
              </div>

              <h3>No activity found</h3>

              <p>
                {logs.length === 0
                  ? "There are no recorded platform activities yet."
                  : "Try changing your search or filter."}
              </p>
            </div>
          ) : (
            <table className="activity-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Entity</th>
                  <th>User ID</th>
                  <th>Date & Time</th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span
                        className={`activity-action ${getActionClass(
                          log.action
                        )}`}
                      >
                        {formatAction(log.action)}
                      </span>
                    </td>

                    <td>
                      <div className="activity-description">
                        {log.description}
                      </div>
                    </td>

                    <td>
                      <span className="activity-entity">
                        {formatEntity(log.entity_type)}
                      </span>
                    </td>

                    <td>
                      <span className="activity-user-id">
                        {log.user_id
                          ? `${log.user_id.substring(
                              0,
                              8
                            )}...`
                          : "System"}
                      </span>
                    </td>

                    <td>
                      <span className="activity-date">
                        {formatDate(log.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="activity-footer">
          Showing{" "}
          <strong>{filteredLogs.length}</strong> of{" "}
          <strong>{logs.length}</strong> activities
        </div>
      </section>
    </div>
  );
}

export default ActivityLogs;