import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

function StaffAcceptInvite() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [invitedUser, setInvitedUser] = useState(null);
  const [staffId, setStaffId] = useState("");

  useEffect(() => {
    verifyInvitation();
  }, []);

  async function verifyInvitation() {
    try {
      setLoading(true);
      setError("");

      // Supabase may return invitation tokens in the URL fragment.
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const tokenType = hashParams.get("type");
      const urlError = hashParams.get("error_description");

      if (urlError) {
        throw new Error(
          decodeURIComponent(urlError.replace(/\+/g, " "))
        );
      }

      // Establish the session when the invitation provides tokens.
      if (
        accessToken &&
        refreshToken &&
        ["invite", "signup", "recovery", null].includes(tokenType)
      ) {
        const { error: sessionError } =
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

        if (sessionError) throw sessionError;

        // Remove sensitive tokens from the visible URL.
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search
        );
      }

      // Also support PKCE invitation links with a code query parameter.
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) throw exchangeError;

        url.searchParams.delete("code");
        window.history.replaceState(
          {},
          document.title,
          url.pathname + url.search + url.hash
        );
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.user) {
        throw new Error(
          "No valid invitation session was found. Please open the newest invitation email and try again."
        );
      }

      const user = session.user;
      const metadata = user.user_metadata || {};

      let linkedStaffId =
        metadata.staff_id || metadata.staffId || "";

      /*
       * Verify the staff record using the authenticated user's ID.
       * This avoids trusting an arbitrary staff ID from the URL.
       */
      let staffQuery = supabase
        .from("staff")
        .select("id, user_id, institution_id, full_name, email, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (linkedStaffId) {
        staffQuery = staffQuery.eq("id", linkedStaffId);
      }

      const { data: staffRecord, error: staffError } =
        await staffQuery.maybeSingle();

      if (staffError) throw staffError;

      if (!staffRecord) {
        console.error("Staff invitation verification details:", {
          userId: user.id,
          metadata,
          email: user.email,
        });

        throw new Error(
          "This invitation is not linked to an active staff record. Please ask the institution administrator to check the staff account and invitation."
        );
      }

      // Confirm the invitation belongs to the staff member's email.
      if (
        user.email &&
        staffRecord.email &&
        user.email.toLowerCase() !== staffRecord.email.toLowerCase()
      ) {
        throw new Error(
          "The invited email does not match the staff record. Please open the invitation sent to the correct email address."
        );
      }

      linkedStaffId = staffRecord.id;

      setStaffId(linkedStaffId);
      setInvitedUser(user);
    } catch (err) {
      console.error("Invitation verification error:", err);
      setError(
        err.message || "Unable to verify the staff invitation."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!invitedUser || !staffId) {
      setError(
        "Your staff invitation has not been verified. Please reopen the invitation email."
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user || user.id !== invitedUser.id) {
        throw new Error(
          "Your invitation session has expired. Please open the invitation email again."
        );
      }

      const { data, error: updateError } =
        await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;

      if (!data?.user || data.user.id !== invitedUser.id) {
        throw new Error("Unable to update your account.");
      }

      /*
       * Update only the staff record linked to this authenticated user.
       */
      const { data: updatedStaff, error: staffUpdateError } =
        await supabase
          .from("staff")
          .update({
            account_status: "active",
            account_created_at: new Date().toISOString(),
          })
          .eq("id", staffId)
          .eq("user_id", data.user.id)
          .select("id")
          .maybeSingle();

      if (staffUpdateError) throw staffUpdateError;

      if (!updatedStaff) {
        throw new Error(
          "Your password was updated, but the staff record could not be activated. Please contact the institution administrator."
        );
      }

      setMessage(
        "Your staff account has been activated successfully. Redirecting to your portal..."
      );

      setTimeout(() => {
        navigate("/staff", { replace: true });
      }, 1800);
    } catch (err) {
      console.error("Staff account activation error:", err);
      setError(
        err.message ||
          "Something went wrong while activating your staff account."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="staff-invite-page">
        <div className="staff-invite-card">
          <div className="staff-invite-header">
            <span className="staff-invite-icon">🎓</span>
            <h1>Staff Account</h1>
            <p>Verifying your invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-invite-page">
      <div className="staff-invite-card">
        <div className="staff-invite-header">
          <span className="staff-invite-icon">🎓</span>

          <h1>Complete Your Staff Account</h1>

          <p>
            Welcome to the Education Management Platform.
            {invitedUser?.email
              ? ` Invitation for ${invitedUser.email}.`
              : " Create your password to activate your staff account."}
          </p>
        </div>

        {error && (
          <div className="staff-invite-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="staff-invite-success" role="status">
            {message}
          </div>
        )}

        {invitedUser && !message && (
          <form onSubmit={handleSetPassword}>
            <div className="staff-invite-field">
              <label htmlFor="password">Create Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter at least 8 characters"
                required
                minLength={8}
              />
            </div>

            <div className="staff-invite-field">
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Re-enter your password"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="staff-invite-button"
              disabled={saving}
            >
              {saving
                ? "Activating Account..."
                : "Create Password & Continue"}
            </button>
          </form>
        )}

        {error && (
          <button
            type="button"
            className="staff-invite-button"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </button>
        )}

        <div className="staff-invite-footer">
          <small>Education Management Platform</small>
        </div>
      </div>
    </div>
  );
}

export default StaffAcceptInvite;