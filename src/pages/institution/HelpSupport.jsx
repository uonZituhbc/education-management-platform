import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import "./HelpSupport.css";

export default function HelpSupport() {
  const [support, setSupport] = useState({
    platform_name: "EMP",
    support_email: "",
    support_phone: "",
  });

  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

  // Support ticket states
  const [ticket, setTicket] = useState({
    subject: "",
    priority: "normal",
    message: "",
  });

  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketError, setTicketError] = useState("");

  useEffect(() => {
    loadSupportDetails();
  }, []);

  async function loadSupportDetails() {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("platform_name, support_email, support_phone")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSupport((previous) => ({
          ...previous,
          ...data,
        }));
      }
    } catch (error) {
      console.error("Could not load support details:", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitTicket(event) {
    event.preventDefault();

    setTicketMessage("");
    setTicketError("");

    if (!ticket.subject.trim()) {
      setTicketError("Please enter a subject.");
      return;
    }

    if (!ticket.message.trim()) {
      setTicketError("Please describe the problem.");
      return;
    }

    setTicketSubmitting(true);

    try {
      // Get currently logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("You must be logged in to submit a support ticket.");
      }

      // Get the active institution membership
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

      // Create support ticket
      const { error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          institution_id: membership.institution_id,
          created_by: user.id,
          subject: ticket.subject.trim(),
          priority: ticket.priority,
          message: ticket.message.trim(),
        });

      if (ticketError) throw ticketError;

      setTicket({
        subject: "",
        priority: "normal",
        message: "",
      });

      setTicketMessage(
        "Your support ticket has been submitted successfully."
      );
    } catch (error) {
      console.error("Support ticket error:", error);

      setTicketError(
        error.message || "Unable to submit your support ticket."
      );
    } finally {
      setTicketSubmitting(false);
    }
  }

  const faqs = [
    {
      question: "How do I register an institution?",
      answer:
        "Institution registration is managed by the EMP Super Admin. Contact the platform administrator if your institution needs to be registered.",
    },
    {
      question: "How do I add a department?",
      answer:
        "Open Departments from the sidebar, choose the option to add a department, fill in the required information, and save.",
    },
    {
      question: "How do I add programmes?",
      answer:
        "Create the relevant department first. Then open Programmes and add the programme, ensuring you select its department.",
    },
    {
      question: "How do I register students or staff?",
      answer:
        "Open Students or Staff from the sidebar and use the available registration form. Ensure you enter accurate information for your institution.",
    },
    {
      question: "Why can't I access a module?",
      answer:
        "Check that you are logged in with the correct account and that your institution membership is active. If the problem continues, contact support.",
    },
    {
      question: "What should I do if I find incorrect information?",
      answer:
        "Open the relevant module and check whether you can edit the record. If you cannot correct it, contact your institution administrator or EMP support.",
    },
  ];

  return (
    <div className="help-support-page">
      {/* HEADER */}
      <div className="help-support-header">
        <div>
          <span className="help-support-eyebrow">
            EMP ASSISTANCE CENTRE
          </span>

          <h1>Help & Support</h1>

          <p>
            Find answers, solve common problems, or contact the EMP support
            team.
          </p>
        </div>

        <div className="help-support-icon" aria-hidden="true">
          🎧
        </div>
      </div>

      {/* CONTACT SUPPORT */}
      <section className="support-contact-card">
        <div className="support-contact-heading">
          <div>
            <span className="support-label">
              NEED PERSONAL ASSISTANCE?
            </span>

            <h2>Contact Support</h2>

            <p>
              Reach out to the team responsible for maintaining{" "}
              {support.platform_name || "EMP"}.
            </p>
          </div>

          <span className="support-status">
            {loading ? "Loading..." : "Support information"}
          </span>
        </div>

        <div className="support-contact-options">
          <div className="support-contact-item">
            <span className="support-contact-symbol" aria-hidden="true">
              ✉️
            </span>

            <div>
              <span>Email support</span>

              {support.support_email ? (
                <a href={`mailto:${support.support_email}`}>
                  {support.support_email}
                </a>
              ) : (
                <p>Support email has not been configured.</p>
              )}
            </div>
          </div>

          <div className="support-contact-item">
            <span className="support-contact-symbol" aria-hidden="true">
              ☎️
            </span>

            <div>
              <span>Phone support</span>

              {support.support_phone ? (
                <a
                  href={`tel:${support.support_phone.replace(
                    /[^\d+]/g,
                    ""
                  )}`}
                >
                  {support.support_phone}
                </a>
              ) : (
                <p>Support phone has not been configured.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SUBMIT SUPPORT TICKET */}
      <section className="support-ticket-card">
        <div className="support-ticket-heading">
          <div>
            <span className="support-label">
              TECHNICAL ASSISTANCE
            </span>

            <h2>Submit a Support Ticket</h2>

            <p>
              Tell us what you are experiencing and the EMP support team
              will assist you.
            </p>
          </div>

          <div className="support-ticket-icon" aria-hidden="true">
            🎫
          </div>
        </div>

        <form onSubmit={submitTicket} className="support-ticket-form">
          <div className="support-form-grid">
            <div className="support-form-group">
              <label htmlFor="ticket-subject">
                Subject
              </label>

              <input
                id="ticket-subject"
                type="text"
                value={ticket.subject}
                onChange={(event) =>
                  setTicket({
                    ...ticket,
                    subject: event.target.value,
                  })
                }
                placeholder="e.g. Unable to register a student"
                maxLength={150}
              />
            </div>

            <div className="support-form-group">
              <label htmlFor="ticket-priority">
                Priority
              </label>

              <select
                id="ticket-priority"
                value={ticket.priority}
                onChange={(event) =>
                  setTicket({
                    ...ticket,
                    priority: event.target.value,
                  })
                }
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="support-form-group">
            <label htmlFor="ticket-message">
              Describe the problem
            </label>

            <textarea
              id="ticket-message"
              value={ticket.message}
              onChange={(event) =>
                setTicket({
                  ...ticket,
                  message: event.target.value,
                })
              }
              placeholder="Describe what happened and what you were trying to do..."
              rows={6}
              maxLength={2000}
            />
          </div>

          {ticketError && (
            <div className="support-ticket-error">
              {ticketError}
            </div>
          )}

          {ticketMessage && (
            <div className="support-ticket-success">
              {ticketMessage}
            </div>
          )}

          <button
            type="submit"
            className="support-ticket-submit"
            disabled={ticketSubmitting}
          >
            {ticketSubmitting
              ? "Submitting..."
              : "Submit Support Ticket"}
          </button>
        </form>
      </section>

      {/* FAQ */}
      <section className="help-faq-section">
        <div className="help-section-heading">
          <div>
            <span className="help-section-eyebrow">
              QUICK ANSWERS
            </span>

            <h2>Frequently Asked Questions</h2>
          </div>

          <span className="faq-count">
            {faqs.length} articles
          </span>
        </div>

        <div className="help-faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;

            return (
              <div
                className={`help-faq-item ${
                  isOpen ? "open" : ""
                }`}
                key={faq.question}
              >
                <button
                  type="button"
                  className="help-faq-question"
                  onClick={() =>
                    setOpenFaq(isOpen ? null : index)
                  }
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>

                  <span
                    className="faq-toggle"
                    aria-hidden="true"
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <p className="help-faq-answer">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* TROUBLESHOOTING */}
      <section className="help-troubleshooting">
        <>
          <div
            className="troubleshooting-symbol"
            aria-hidden="true"
          >
            ✓
          </div>

          <div>
            <h2>Before contacting support</h2>

            <p>Try these simple checks first:</p>

            <ul>
              <li>
                Confirm that your internet connection is working.
              </li>

              <li>
                Refresh the page and sign in again if necessary.
              </li>

              <li>
                Check that you are using the correct institution
                account.
              </li>

              <li>
                Record any error message so you can share it with
                support.
              </li>
            </ul>
          </div>
        </>
      </section>
    </div>
  );
}