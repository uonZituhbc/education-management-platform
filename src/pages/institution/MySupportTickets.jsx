import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import "./MySupportTickets.css";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getLabel(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export default function MySupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("Please sign in to view your support tickets.");
      }

      // Find the institution associated with this administrator.
      const { data: membership, error: membershipError } = await supabase
        .from("institution_members")
        .select("institution_id")
        .eq("user_id", user.id)
        .eq("role", "institution_admin")
        .eq("is_active", true)
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership) {
        throw new Error(
          "No active institution administrator membership was found."
        );
      }

      // RLS restricts the results to tickets this administrator is
      // authorized to see for their institution.
      const { data, error } = await supabase
        .from("support_tickets")
        .select(`
          id,
          subject,
          message,
          priority,
          status,
          admin_response,
          created_at,
          updated_at,
          resolved_at
        `)
        .eq("institution_id", membership.institution_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTickets(data ?? []);
    } catch (error) {
      console.error("My support tickets error:", error);
      setErrorMessage(
        error.message || "Unable to load your support tickets."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      !search.trim() ||
      ticket.subject.toLowerCase().includes(search.trim().toLowerCase()) ||
      ticket.message.toLowerCase().includes(search.trim().toLowerCase());

    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const counts = {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === "open").length,
    inProgress: tickets.filter((ticket) => ticket.status === "in_progress")
      .length,
    completed: tickets.filter(
      (ticket) =>
        ticket.status === "resolved" || ticket.status === "closed"
    ).length,
  };

  return (
    <div className="mst-page">
      <header className="mst-header">
        <div>
          <span className="mst-eyebrow">HELP & SUPPORT</span>
          <h1>My Support Tickets</h1>
          <p>
            Track your requests and view responses from the EMP support team.
          </p>
        </div>

        <button
          type="button"
          className="mst-refresh"
          onClick={loadTickets}
          disabled={loading}
        >
          ↻ {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      <section className="mst-stats">
        <article className="mst-stat">
          <span>🎫</span>
          <div>
            <small>Total tickets</small>
            <strong>{counts.total}</strong>
          </div>
        </article>

        <article className="mst-stat">
          <span>📨</span>
          <div>
            <small>Open</small>
            <strong>{counts.open}</strong>
          </div>
        </article>

        <article className="mst-stat">
          <span>🛠️</span>
          <div>
            <small>In progress</small>
            <strong>{counts.inProgress}</strong>
          </div>
        </article>

        <article className="mst-stat">
          <span>✅</span>
          <div>
            <small>Resolved / Closed</small>
            <strong>{counts.completed}</strong>
          </div>
        </article>
      </section>

      <section className="mst-panel">
        <div className="mst-panel-header">
          <div>
            <h2>Your Requests</h2>
            <p>{filteredTickets.length} tickets found</p>
          </div>

          <button
            type="button"
            className="mst-secondary-button"
            onClick={() => {
              window.location.href = "/dashboard/help-support";
            }}
          >
            + New Ticket
          </button>
        </div>

        <div className="mst-filters">
          <input
            type="search"
            placeholder="Search your tickets..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search your tickets"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter tickets by status"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {errorMessage && (
          <div className="mst-error" role="alert">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="mst-empty">Loading your tickets...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="mst-empty">
            <span>🎫</span>
            <h3>No support tickets found</h3>
            <p>
              Your submitted tickets will appear here. If you've already
              submitted a ticket, try refreshing this page.
            </p>
          </div>
        ) : (
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <strong>{ticket.subject}</strong>
                      <small>
                        {ticket.message.length > 75
                          ? `${ticket.message.slice(0, 75)}...`
                          : ticket.message}
                      </small>
                    </td>

                    <td>
                      <span
                        className={`mst-priority priority-${ticket.priority}`}
                      >
                        {getLabel(PRIORITY_OPTIONS, ticket.priority)}
                      </span>
                    </td>

                    <td>
                      <span className={`mst-status status-${ticket.status}`}>
                        {getLabel(STATUS_OPTIONS, ticket.status)}
                      </span>
                    </td>

                    <td>{formatDate(ticket.created_at)}</td>

                    <td>
                      <button
                        type="button"
                        className="mst-view-button"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedTicket && (
        <div
          className="mst-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedTicket(null);
            }
          }}
        >
          <section
            className="mst-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mst-modal-title"
          >
            <div className="mst-modal-header">
              <div>
                <span className="mst-eyebrow">TICKET DETAILS</span>
                <h2 id="mst-modal-title">{selectedTicket.subject}</h2>
              </div>

              <button
                type="button"
                className="mst-close"
                onClick={() => setSelectedTicket(null)}
                aria-label="Close ticket details"
              >
                ×
              </button>
            </div>

            <div className="mst-modal-meta">
              <div>
                <small>Status</small>
                <span
                  className={`mst-status status-${selectedTicket.status}`}
                >
                  {getLabel(STATUS_OPTIONS, selectedTicket.status)}
                </span>
              </div>

              <div>
                <small>Priority</small>
                <span
                  className={`mst-priority priority-${selectedTicket.priority}`}
                >
                  {getLabel(PRIORITY_OPTIONS, selectedTicket.priority)}
                </span>
              </div>

              <div>
                <small>Submitted</small>
                <strong>{formatDate(selectedTicket.created_at)}</strong>
              </div>

              <div>
                <small>Last updated</small>
                <strong>{formatDate(selectedTicket.updated_at)}</strong>
              </div>
            </div>

            <div className="mst-message">
              <h3>Your Message</h3>
              <p>{selectedTicket.message}</p>
            </div>

            <div className="mst-response">
              <h3>💬 Super Admin Response</h3>

              {selectedTicket.admin_response ? (
                <p>{selectedTicket.admin_response}</p>
              ) : (
                <p className="mst-pending">
                  Your ticket has been received. The support team has not
                  responded yet.
                </p>
              )}
            </div>

            {selectedTicket.resolved_at && (
              <p className="mst-resolved-date">
                Resolved: {formatDate(selectedTicket.resolved_at)}
              </p>
            )}

            <button
              type="button"
              className="mst-done-button"
              onClick={() => setSelectedTicket(null)}
            >
              Close Details
            </button>
          </section>
        </div>
      )}
    </div>
  );
}