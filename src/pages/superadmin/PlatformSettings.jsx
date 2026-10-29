import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import "./PlatformSettings.css";

function PlatformSettings() {
  const [settingsId, setSettingsId] = useState(null);

  const [form, setForm] = useState({
    platform_name: "",
    platform_description: "",
    support_email: "",
    support_phone: "",
    maintenance_mode: false,
    allow_institution_registration: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setSettingsId(data.id);

        setForm({
          platform_name: data.platform_name || "",
          platform_description: data.platform_description || "",
          support_email: data.support_email || "",
          support_phone: data.support_phone || "",
          maintenance_mode: Boolean(data.maintenance_mode),
          allow_institution_registration:
            Boolean(data.allow_institution_registration),
        });
      }
    } catch (err) {
      console.error("Platform settings error:", err);
      setError(
        err.message || "Failed to load platform settings."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setMessage("");
  }

  async function handleSave(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in.");
      }

      const payload = {
        platform_name: form.platform_name.trim(),
        platform_description:
          form.platform_description.trim(),
        support_email: form.support_email.trim(),
        support_phone: form.support_phone.trim(),
        maintenance_mode: form.maintenance_mode,
        allow_institution_registration:
          form.allow_institution_registration,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (!payload.platform_name) {
        throw new Error("Platform name is required.");
      }

      let result;

      if (settingsId) {
        result = await supabase
          .from("platform_settings")
          .update(payload)
          .eq("id", settingsId)
          .select()
          .single();
      } else {
        result = await supabase
          .from("platform_settings")
          .insert(payload)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      if (result.data) {
        setSettingsId(result.data.id);
      }

      setMessage("Platform settings saved successfully.");
    } catch (err) {
      console.error("Save settings error:", err);

      setError(
        err.message || "Failed to save platform settings."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (
      !window.confirm(
        "Reset platform settings to their default values?"
      )
    ) {
      return;
    }

    setForm({
      platform_name: "Education Management Platform",
      platform_description:
        "A unified platform for managing educational institutions.",
      support_email: "",
      support_phone: "",
      maintenance_mode: false,
      allow_institution_registration: true,
    });

    setMessage("Default values restored. Click Save Changes to apply them.");
    setError("");
  }

  if (loading) {
    return (
      <div className="superadmin-settings-page">
        <div className="settings-loading">
          <div className="settings-spinner"></div>
          <p>Loading platform settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-settings-page">
      <div className="settings-header">
        <div>
          <span className="settings-eyebrow">
            PLATFORM CONFIGURATION
          </span>

          <h1>Platform Settings</h1>

          <p>
            Manage global configuration for the entire
            Education Management Platform.
          </p>
        </div>
      </div>

      {message && (
        <div className="settings-success">
          <span>✓</span>
          <div>
            <strong>Success</strong>
            <p>{message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="settings-error">
          <span>!</span>
          <div>
            <strong>Something went wrong</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <form
        className="settings-form"
        onSubmit={handleSave}
      >
        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon blue">
              ⚙️
            </div>

            <div>
              <h2>General Information</h2>
              <p>
                Basic information displayed across the
                platform.
              </p>
            </div>
          </div>

          <div className="settings-fields">
            <div className="settings-field full">
              <label htmlFor="platform_name">
                Platform Name
              </label>

              <input
                id="platform_name"
                name="platform_name"
                type="text"
                value={form.platform_name}
                onChange={handleChange}
                placeholder="Education Management Platform"
              />
            </div>

            <div className="settings-field full">
              <label htmlFor="platform_description">
                Platform Description
              </label>

              <textarea
                id="platform_description"
                name="platform_description"
                value={form.platform_description}
                onChange={handleChange}
                rows="4"
                placeholder="Describe your platform..."
              />
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon green">
              ☎️
            </div>

            <div>
              <h2>Support Information</h2>
              <p>
                Contact information for platform support.
              </p>
            </div>
          </div>

          <div className="settings-fields two-columns">
            <div className="settings-field">
              <label htmlFor="support_email">
                Support Email
              </label>

              <input
                id="support_email"
                name="support_email"
                type="email"
                value={form.support_email}
                onChange={handleChange}
                placeholder="support@example.com"
              />
            </div>

            <div className="settings-field">
              <label htmlFor="support_phone">
                Support Phone
              </label>

              <input
                id="support_phone"
                name="support_phone"
                type="tel"
                value={form.support_phone}
                onChange={handleChange}
                placeholder="+254..."
              />
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon orange">
              ⚡
            </div>

            <div>
              <h2>Platform Controls</h2>
              <p>
                Control important platform-wide behaviours.
              </p>
            </div>
          </div>

          <div className="settings-control-list">
            <div className="settings-control">
              <div>
                <strong>Allow Institution Registration</strong>

                <p>
                  Allow new institutions to be registered
                  on the platform.
                </p>
              </div>

              <label className="settings-switch">
                <input
                  type="checkbox"
                  name="allow_institution_registration"
                  checked={
                    form.allow_institution_registration
                  }
                  onChange={handleChange}
                />

                <span></span>
              </label>
            </div>

            <div className="settings-control">
              <div>
                <strong>Maintenance Mode</strong>

                <p>
                  Temporarily place the platform into
                  maintenance mode.
                </p>
              </div>

              <label className="settings-switch">
                <input
                  type="checkbox"
                  name="maintenance_mode"
                  checked={form.maintenance_mode}
                  onChange={handleChange}
                />

                <span></span>
              </label>
            </div>
          </div>
        </section>

        {form.maintenance_mode && (
          <div className="maintenance-warning">
            <div className="maintenance-warning-icon">
              ⚠️
            </div>

            <div>
              <strong>Maintenance mode is enabled</strong>

              <p>
                The platform is marked as being under
                maintenance. We will connect this setting
                to the application's access control later.
              </p>
            </div>
          </div>
        )}

        <div className="settings-actions">
          <button
            type="button"
            className="settings-reset-button"
            onClick={handleReset}
            disabled={saving}
          >
            Reset
          </button>

          <button
            type="submit"
            className="settings-save-button"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PlatformSettings;