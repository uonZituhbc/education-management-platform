import React, { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import "./Settings.css";

const institutionTypes = [
  { value: "primary", label: "Primary School" },
  { value: "secondary", label: "Secondary School" },
  { value: "college", label: "College" },
  { value: "tvet", label: "TVET Institution" },
  { value: "university", label: "University" },
  { value: "other", label: "Other" },
];

const Settings = () => {
  const [institution, setInstitution] = useState(null);
  const [form, setForm] = useState({
    name: "",
    institution_type: "",
    email: "",
    phone: "",
    address: "",
    logo_url: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    loadInstitutionSettings();
  }, []);

  const loadInstitutionSettings = async () => {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Please sign in again.");
      }

      // Find the institution assigned to the logged-in administrator.
      const { data: membership, error: membershipError } =
        await supabase
          .from("institution_members")
          .select("institution_id, role, is_active")
          .eq("user_id", user.id)
          .eq("role", "institution_admin")
          .eq("is_active", true)
          .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership) {
        throw new Error(
          "No active institution administrator membership was found for your account."
        );
      }

      // Load only the institution assigned to this administrator.
      const { data, error } = await supabase
        .from("institutions")
        .select(
          "id, name, institution_type, email, phone, address, logo_url"
        )
        .eq("id", membership.institution_id)
        .single();

      if (error) throw error;

      setInstitution(data);

      setForm({
        name: data.name || "",
        institution_type: data.institution_type || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        logo_url: data.logo_url || "",
      });
    } catch (error) {
      console.error("Institution settings loading error:", error);

      setMessage(
        error.message || "Failed to load institution settings."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!institution?.id) {
      setMessage("Institution information is unavailable.");
      setMessageType("error");
      return;
    }

    if (!form.name.trim()) {
      setMessage("Institution name is required.");
      setMessageType("error");
      return;
    }

    if (!form.institution_type) {
      setMessage("Please select an institution type.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      // Recheck the current user and active membership before saving.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("institution_members")
          .select("institution_id")
          .eq("user_id", user.id)
          .eq("institution_id", institution.id)
          .eq("role", "institution_admin")
          .eq("is_active", true)
          .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership) {
        throw new Error(
          "You are not authorized to change this institution's settings."
        );
      }

      const updates = {
        name: form.name.trim(),
        institution_type: form.institution_type,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        logo_url: form.logo_url.trim() || null,
      };

      const { data, error } = await supabase
        .from("institutions")
        .update(updates)
        .eq("id", institution.id)
        .select(
          "id, name, institution_type, email, phone, address, logo_url"
        )
        .single();

      if (error) throw error;

      setInstitution(data);

      setForm({
        name: data.name || "",
        institution_type: data.institution_type || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        logo_url: data.logo_url || "",
      });

      setMessage("Institution settings saved successfully.");
      setMessageType("success");
    } catch (error) {
      console.error("Institution settings save error:", error);

      setMessage(
        error.message || "Failed to save institution settings."
      );
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="institution-settings-page">
        <div className="settings-loading">
          <div className="settings-spinner" />
          <p>Loading institution settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="institution-settings-page">
      <header className="settings-page-header">
        <div>
          <span className="settings-eyebrow">
            INSTITUTION MANAGEMENT
          </span>
          <h1>Institution Settings</h1>
          <p>
            Manage your institution's profile and contact information.
          </p>
        </div>

        <div className="settings-header-icon">⚙️</div>
      </header>

      {message && (
        <div
          className={`settings-message ${messageType}`}
          role="status"
        >
          <span>{messageType === "success" ? "✓" : "!"}</span>
          {message}
        </div>
      )}

      {institution && (
        <div className="settings-content">
          <section className="settings-profile-card">
            <div className="settings-profile-logo">
              {form.logo_url ? (
                <img
                  src={form.logo_url}
                  alt={`${form.name} logo`}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span>
                  {form.name.charAt(0).toUpperCase() || "I"}
                </span>
              )}
            </div>

            <div className="settings-profile-info">
              <span className="settings-profile-label">
                CURRENT INSTITUTION
              </span>
              <h2>{form.name || "Your Institution"}</h2>
              <p>
                {institutionTypes.find(
                  (item) => item.value === form.institution_type
                )?.label || "Institution"}
              </p>
            </div>

            <div className="settings-profile-status">
              <span className="settings-status-dot" />
              Institution profile
            </div>
          </section>

          <form onSubmit={handleSave}>
            <section className="settings-section">
              <div className="settings-section-heading">
                <div className="settings-section-icon">🏫</div>
                <div>
                  <h2>Institution Profile</h2>
                  <p>
                    Update your institution's official information.
                  </p>
                </div>
              </div>

              <div className="settings-form-grid">
                <div className="settings-field">
                  <label htmlFor="institution-name">
                    Institution Name *
                  </label>
                  <input
                    id="institution-name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter institution name"
                    required
                  />
                </div>

                <div className="settings-field">
                  <label htmlFor="institution-type">
                    Institution Type *
                  </label>
                  <select
                    id="institution-type"
                    name="institution_type"
                    value={form.institution_type}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select institution type</option>
                    {institutionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="settings-field">
                  <label htmlFor="institution-email">
                    Official Email
                  </label>
                  <input
                    id="institution-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="institution@example.com"
                  />
                </div>

                <div className="settings-field">
                  <label htmlFor="institution-phone">
                    Phone Number
                  </label>
                  <input
                    id="institution-phone"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+254..."
                  />
                </div>

                <div className="settings-field settings-field-full">
                  <label htmlFor="institution-address">
                    Physical Address
                  </label>
                  <textarea
                    id="institution-address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter the institution's physical address"
                    rows={3}
                  />
                </div>

                <div className="settings-field settings-field-full">
                  <label htmlFor="institution-logo">
                    Institution Logo URL
                  </label>
                  <input
                    id="institution-logo"
                    type="url"
                    name="logo_url"
                    value={form.logo_url}
                    onChange={handleChange}
                    placeholder="https://example.com/logo.png"
                  />
                  <small>
                    Enter a publicly accessible image URL. File uploads
                    can be added later using Supabase Storage.
                  </small>
                </div>
              </div>
            </section>

            <section className="settings-section settings-notice">
              <div className="settings-notice-icon">🔒</div>
              <div>
                <h3>Institution-level access</h3>
                <p>
                  These settings apply to your institution only.
                  Platform-wide settings, subscriptions, and licensing
                  remain under Super Admin control.
                </p>
              </div>
            </section>

            <div className="settings-form-actions">
              <button
                type="button"
                className="settings-reset-btn"
                disabled={saving}
                onClick={() => {
                  setForm({
                    name: institution.name || "",
                    institution_type:
                      institution.institution_type || "",
                    email: institution.email || "",
                    phone: institution.phone || "",
                    address: institution.address || "",
                    logo_url: institution.logo_url || "",
                  });
                  setMessage("");
                }}
              >
                Reset Changes
              </button>

              <button
                type="submit"
                className="settings-save-btn"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Settings;