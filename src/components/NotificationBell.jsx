import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import "./NotificationBell.css";

function formatTime(value) {
  const date = new Date(value);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
  });
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("notifications")
        .select(
          "id, title, message, type, related_ticket_id, is_read, created_at"
        )
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (queryError) throw queryError;

      const items = data ?? [];
      setNotifications(items);
      setUnreadCount(items.filter((item) => !item.is_read).length);
      setError("");
    } catch (err) {
      console.error("Notification loading error:", err);
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Refresh periodically to detect new notifications.
    const interval = setInterval(loadNotifications, 30000);

    // Also listen for realtime database changes.
    let channel;

    async function subscribeToNotifications() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return;

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          loadNotifications
        )
        .subscribe();
    }

    subscribeToNotifications();

    return () => {
      clearInterval(interval);

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadNotifications]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function markAsRead(notification) {
    if (notification.is_read) return;

    const readAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: readAt })
      .eq("id", notification.id);

    if (updateError) {
      console.error("Unable to mark notification as read:", updateError);
      setError("Unable to mark notification as read.");
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, is_read: true, read_at: readAt }
          : item
      )
    );

    setUnreadCount((current) => Math.max(0, current - 1));
  }

  async function markAllAsRead() {
    const unreadIds = notifications
      .filter((item) => !item.is_read)
      .map((item) => item.id);

    if (!unreadIds.length) return;

    const readAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: readAt })
      .in("id", unreadIds);

    if (updateError) {
      console.error("Unable to mark all as read:", updateError);
      setError("Unable to mark notifications as read.");
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        unreadIds.includes(item.id)
          ? { ...item, is_read: true, read_at: readAt }
          : item
      )
    );

    setUnreadCount(0);
  }

  async function handleNotificationClick(notification) {
    await markAsRead(notification);
    setOpen(false);

    if (notification.related_ticket_id) {
      // Adjust this destination if your ticket details page uses another route.
      navigate("/dashboard/my-support-tickets");
    }
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className={`notification-bell-button ${open ? "is-open" : ""}`}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) loadNotifications();
        }}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <div>
              <h3>Notifications</h3>
              <p>
                {unreadCount
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-mark-all"
                onClick={markAllAsRead}
              >
                Mark all read
              </button>
            )}
          </div>

          {error && (
            <div className="notification-error" role="alert">
              {error}
            </div>
          )}

          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <span>🔔</span>
                <strong>No notifications yet</strong>
                <p>New updates will appear here.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className={`notification-item ${
                    notification.is_read ? "read" : "unread"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="notification-item-icon">
                    {notification.type === "support_ticket"
                      ? "🎫"
                      : notification.type === "security"
                        ? "🛡️"
                        : notification.type === "academic"
                          ? "🎓"
                          : "🔔"}
                  </span>

                  <span className="notification-item-content">
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                    <small>{formatTime(notification.created_at)}</small>
                  </span>

                  {!notification.is_read && (
                    <span className="notification-unread-dot" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="notification-dropdown-footer">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/dashboard/my-support-tickets");
              }}
            >
              View My Support Tickets →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}