import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import "./SupportTickets.css";

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

function labelFor(options, value) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("open");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(`
          id,
          institution_id,
          created_by,
          subject,
          message,
          status,
          priority,
          admin_response,
          created_at,
          updated_at,
          resolved_at,
          institutions (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTickets(data ?? []);

      setSelectedTicket((current) => {
        if (!current) return null;
        return (data ?? []).find((ticket) => ticket.id === current.id) ?? null;
      });
    } catch (error) {
      console.error("Unable to load support tickets:", error);
      setLoadError(
        error.message ||
          "Unable to load support tickets. Please check your permissions and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedTicket) {
      setResponse("");
      setNewStatus("open");
      return;
    }

    setResponse(selectedTicket.admin_response ?? "");
    setNewStatus(selectedTicket.status ?? "open");
    setFeedback("");
    setActionError("");
  }, [selectedTicket?.id]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;

    const matchesPriority =
      priorityFilter === "all" || ticket.priority === priorityFilter;

    const institutionName =
      ticket.institutions?.name ?? "Unknown institution";

    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      ticket.subject?.toLowerCase().includes(query) ||
      ticket.message?.toLowerCase().includes(query) ||
      institutionName.toLowerCase().includes(query);

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const counts = {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === "open").length,
    inProgress: tickets.filter((ticket) => ticket.status === "in_progress")
      .length,
    resolved: tickets.filter(
      (ticket) =>
        ticket.status === "resolved" || ticket.status === "closed"
    ).length,
  };

  async function saveTicketChanges(event) {
    event.preventDefault();

    if (!selectedTicket) return;

    setSaving(true);
    setFeedback("");
    setActionError("");

    try {
      const now = new Date().toISOString();

      const updates = {
        admin_response: response.trim() || null,
        status: newStatus,
        updated_at: now,
        resolved_at:
          newStatus === "resolved"
            ? selectedTicket.resolved_at || now
            : newStatus === "closed"
              ? selectedTicket.resolved_at || now
              : null,
      };

      const { data, error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", selectedTicket.id)
        .select(`
          id,
          institution_id,
          created_by,
          subject,
          message,
          status,
          priority,
          admin_response,
          created_at,
          updated_at,
          resolved_at,
          institutions (
            id,
            name
          )
        `)
        .single();

      if (error) throw error;

      setTickets((current) =>
        current.map((ticket) => (ticket.id === data.id ? data : ticket))
      );
      setSelectedTicket(data);
      setFeedback("Ticket updated successfully.");
    } catch (error) {
      console.error("Unable to update support ticket:", error);
      setActionError(
        error.message ||
          "Unable to update the ticket. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sat-page">
      <header className="sat-header">
        <div>
          <span className="sat-eyebrow">PLATFORM MANAGEMENT</span>
          <h1>Support Tickets</h1>
          <p>
            Review institution support requests, respond to issues, and track
            their progress.
          </p>
        </div>

        <button
          type="button"
          className="sat-refresh"
          onClick={loadTickets}
          disabled={loading}
        >
          ↻ {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      <section className="sat-stats">
        <article className="sat-stat-card">
          <span className="sat-stat-icon">🎫</span>
          <div>
            <span>Total tickets</span>
            <strong>{counts.total}</strong>
          </div>
        </article>

        <article className="sat-stat-card">
          <span className="sat-stat-icon">📨</span>
          <div>
            <span>Open</span>
            <strong>{counts.open}</strong>
          </div>
        </article>

        <article className="sat-stat-card">
          <span className="sat-stat-icon">🛠️</span>
          <div>
            <span>In progress</span>
            <strong>{counts.inProgress}</strong>
          </div>
        </article>

        <article className="sat-stat-card">
          <span className="sat-stat-icon">✅</span>
          <div>
            <span>Resolved / Closed</span>
            <strong>{counts.resolved}</strong>
          </div>
        </article>
      </section>

      <section className="sat-workspace">
        <div className="sat-list-panel">
          <div className="sat-panel-heading">
            <div>
              <h2>All Requests</h2>
              <span>{filteredTickets.length} matching tickets</span>
            </div>
          </div>

          <div className="sat-filters">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subject or institution..."
              aria-label="Search tickets"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              aria-label="Filter by priority"
            >
              <option value="all">All priorities</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {loadError && (
            <div className="sat-error" role="alert">
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="sat-empty">Loading support tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="sat-empty">
              <span>🎫</span>
              <strong>No tickets found</strong>
              <p>Try changing your filters or search terms.</p>
            </div>
          ) : (
            <div className="sat-ticket-list">
              {filteredTickets.map((ticket) => (
                <button
                  type="button"
                  key={ticket.id}
                  className={`sat-ticket-item ${
                    selectedTicket?.id === ticket.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="sat-ticket-topline">
                    <span
                      className={`sat-priority priority-${ticket.priority}`}
                    >
                      {labelFor(PRIORITY_OPTIONS, ticket.priority)}
                    </span>
                    <span
                      className={`sat-status status-${ticket.status}`}
                    >
                      {labelFor(STATUS_OPTIONS, ticket.status)}
                    </span>
                  </div>

                  <strong className="sat-ticket-subject">
                    {ticket.subject}
                  </strong>

                  <span className="sat-ticket-institution">
                    🏢 {ticket.institutions?.name ?? "Unknown institution"}
                  </span>

                  <span className="sat-ticket-date">
                    {formatDate(ticket.created_at)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sat-detail-panel">
          {!selectedTicket ? (
            <div className="sat-detail-empty">
              <span>💬</span>
              <h2>Ticket Details</h2>
              <p>Select a ticket from the list to review it and respond.</p>
            </div>
          ) : (
            <>
              <div className="sat-detail-heading">
                <div>
                  <span className="sat-eyebrow">TICKET DETAILS</span>
                  <h2>{selectedTicket.subject}</h2>
                  <p>
                    {selectedTicket.institutions?.name ??
                      "Unknown institution"}
                  </p>
                </div>
                <span
                  className={`sat-status status-${selectedTicket.status}`}
                >
                  {labelFor(STATUS_OPTIONS, selectedTicket.status)}
                </span>
              </div>

              <div className="sat-ticket-meta">
                <div>
                  <span>Priority</span>
                  <strong>
                    {labelFor(PRIORITY_OPTIONS, selectedTicket.priority)}
                  </strong>
                </div>
                <div>
                  <span>Submitted</span>
                  <strong>{formatDate(selectedTicket.created_at)}</strong>
                </div>
                <div>
                  <span>Last updated</span>
                  <strong>{formatDate(selectedTicket.updated_at)}</strong>
                </div>
                <div>
                  <span>Resolved at</span>
                  <strong>{formatDate(selectedTicket.resolved_at)}</strong>
                </div>
              </div>

              <div className="sat-message-block">
                <h3>Institution's Message</h3>
                <p>{selectedTicket.message}</p>
              </div>

              <form
                className="sat-response-form"
                onSubmit={saveTicketChanges}
              >
                <label htmlFor="sat-admin-response">
                  Admin Response
                </label>

                <textarea
                  id="sat-admin-response"
                  value={response}
                  onChange={(event) => setResponse(event.target.value)}
                  placeholder="Write a response or explain the action taken..."
                  rows={6}
                />

                <label htmlFor="sat-ticket-status">
                  Update Ticket Status
                </label>

                <select
                  id="sat-ticket-status"
                  value={newStatus}
                  onChange={(event) => setNewStatus(event.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {feedback && (
                  <div className="sat-success" role="status">
                    {feedback}
                  </div>
                )}

                {actionError && (
                  <div className="sat-error" role="alert">
                    {actionError}
                  </div>
                )}

                <button
                  type="submit"
                  className="sat-save-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Response & Status"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}