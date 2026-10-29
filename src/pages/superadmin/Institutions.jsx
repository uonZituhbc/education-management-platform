import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import { logActivity } from "../../lib/activityLogger";
import "./Institutions.css";

const emptyForm = {
  name: "",
  institution_type: "",
  email: "",
  phone: "",
  address: "",
  logo_url: "",
};

const Institutions = () => {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingInstitution, setEditingInstitution] =
    useState(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [selectedInstitution, setSelectedInstitution] =
    useState(null);

  const [institutionStats, setInstitutionStats] =
    useState(null);

  const [administrators, setAdministrators] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("institutions")
        .select(`
          id,
          name,
          institution_type,
          email,
          phone,
          address,
          logo_url,
          is_active,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setInstitutions(data || []);
    } catch (error) {
      console.error("Institutions loading error:", error);

      setMessage(
        error.message || "Failed to load institutions."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredInstitutions = useMemo(() => {
    return institutions.filter((institution) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        institution.name?.toLowerCase().includes(searchValue) ||
        institution.email?.toLowerCase().includes(searchValue) ||
        institution.phone?.toLowerCase().includes(searchValue);

      const matchesType =
        typeFilter === "all" ||
        institution.institution_type === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && institution.is_active) ||
        (statusFilter === "inactive" && !institution.is_active);

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus
      );
    });
  }, [
    institutions,
    search,
    typeFilter,
    statusFilter,
  ]);

  const activeCount = institutions.filter(
    (institution) => institution.is_active
  ).length;

  const inactiveCount = institutions.filter(
    (institution) => !institution.is_active
  ).length;

  const openAddModal = () => {
    setEditingInstitution(null);
    setForm(emptyForm);
    setMessage("");
    setShowModal(true);
  };

  const openEditModal = (institution) => {
    setEditingInstitution(institution);

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
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingInstitution(null);
    setForm(emptyForm);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setMessage("Institution name is required.");
      return;
    }

    if (!form.institution_type) {
      setMessage("Please select the institution type.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const institutionData = {
        name: form.name.trim(),
        institution_type: form.institution_type,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        logo_url: form.logo_url.trim() || null,
      };

      if (editingInstitution) {
        const { data, error } = await supabase
          .from("institutions")
          .update(institutionData)
          .eq("id", editingInstitution.id)
          .select()
          .single();

        if (error) throw error;

        await logActivity({
          action: "updated",
          entityType: "institution",
          entityId: data.id,
          description: `Updated institution "${data.name}"`,
          institutionId: data.id,
          metadata: {
            institution_type: data.institution_type,
            email: data.email,
            phone: data.phone,
          },
        });

        setMessage(
          "Institution updated successfully."
        );
      } else {
        const { data, error } = await supabase
          .from("institutions")
          .insert({
            ...institutionData,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;

        await logActivity({
          action: "created",
          entityType: "institution",
          entityId: data.id,
          description: `Created institution "${data.name}"`,
          institutionId: data.id,
          metadata: {
            institution_type: data.institution_type,
            email: data.email,
            phone: data.phone,
          },
        });

        setMessage(
          "Institution added successfully."
        );
      }

      await loadInstitutions();

      setShowModal(false);
      setEditingInstitution(null);
      setForm(emptyForm);
    } catch (error) {
      console.error("Institution save error:", error);

      setMessage(
        error.message || "Failed to save institution."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleInstitutionStatus = async (institution) => {
    const newStatus = !institution.is_active;

    const confirmed = window.confirm(
      newStatus
        ? `Activate ${institution.name}?`
        : `Deactivate ${institution.name}?`
    );

    if (!confirmed) return;

    try {
      const { data, error } = await supabase
        .from("institutions")
        .update({
          is_active: newStatus,
        })
        .eq("id", institution.id)
        .select()
        .single();

      if (error) throw error;

      await logActivity({
        action: newStatus ? "activated" : "deactivated",
        entityType: "institution",
        entityId: data.id,
        description: `${newStatus ? "Activated" : "Deactivated"} institution "${data.name}"`,
        institutionId: data.id,
        metadata: {
          is_active: newStatus,
        },
      });

      setMessage(
        `${institution.name} has been ${
          newStatus ? "activated" : "deactivated"
        }.`
      );

      await loadInstitutions();
    } catch (error) {
      console.error(
        "Institution status update error:",
        error
      );

      setMessage(
        error.message ||
          "Failed to update institution status."
      );
    }
  };

  const loadInstitutionDetails = async (institution) => {
    setSelectedInstitution(institution);
    setLoadingDetails(true);
    setInstitutionStats(null);
    setAdministrators([]);

    try {
      const [
        departmentsResult,
        programmesResult,
        staffResult,
        studentsResult,
        classesResult,
        academicUnitsResult,
        administratorsResult,
      ] = await Promise.all([
        supabase
          .from("departments")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("institution_id", institution.id),

        supabase
          .from("programmes")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("institution_id", institution.id),

        supabase
          .from("staff")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("institution_id", institution.id),

        supabase
          .from("students")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("institution_id", institution.id),

        supabase
          .from("classes")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("institution_id", institution.id),

        supabase
          .from("academic_units")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("institution_id", institution.id),

        supabase
          .from("institution_members")
          .select(`
            user_id,
            role,
            is_active
          `)
          .eq("institution_id", institution.id)
          .eq("role", "institution_admin"),
      ]);

      const results = [
        departmentsResult,
        programmesResult,
        staffResult,
        studentsResult,
        classesResult,
        academicUnitsResult,
        administratorsResult,
      ];

      const failedResult = results.find(
        (result) => result.error
      );

      if (failedResult) {
        throw failedResult.error;
      }

      setInstitutionStats({
        departments: departmentsResult.count || 0,
        programmes: programmesResult.count || 0,
        staff: staffResult.count || 0,
        students: studentsResult.count || 0,
        classes: classesResult.count || 0,
        academicUnits:
          academicUnitsResult.count || 0,
      });

      setAdministrators(
        administratorsResult.data || []
      );
    } catch (error) {
      console.error(
        "Institution details error:",
        error
      );

      setMessage(
        error.message ||
          "Failed to load institution details."
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setSelectedInstitution(null);
    setInstitutionStats(null);
    setAdministrators([]);
  };

  return (
    <div className="superadmin-institutions">
      <div className="institutions-header">
        <div>
          <span className="page-eyebrow">
            PLATFORM MANAGEMENT
          </span>

          <h1>Institutions</h1>

          <p>
            Manage every institution registered on the
            Education Management Platform.
          </p>
        </div>

        <button
          className="add-institution-btn"
          onClick={openAddModal}
        >
          + Add Institution
        </button>
      </div>

      {message && (
        <div className="institutions-message">
          {message}
        </div>
      )}

      <div className="institution-summary">
        <div className="summary-card">
          <span className="summary-icon">🏢</span>

          <div>
            <small>Total Institutions</small>
            <strong>{institutions.length}</strong>
          </div>
        </div>

        <div className="summary-card">
          <span className="summary-icon">🟢</span>

          <div>
            <small>Active</small>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="summary-card">
          <span className="summary-icon">🔴</span>

          <div>
            <small>Inactive</small>
            <strong>{inactiveCount}</strong>
          </div>
        </div>
      </div>

      <div className="institution-toolbar">
        <div className="institution-search">
          <span>🔍</span>

          <input
            type="text"
            placeholder="Search institutions..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value)
          }
        >
          <option value="all">All Types</option>

          <option value="primary">
            Primary School
          </option>

          <option value="secondary">
            Secondary School
          </option>

          <option value="college">
            College
          </option>

          <option value="tvet">
            TVET
          </option>

          <option value="university">
            University
          </option>

          <option value="other">
            Other
          </option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="institutions-card">
        <div className="institutions-table-header">
          <div>
            <h2>Registered Institutions</h2>

            <p>
              {filteredInstitutions.length} institution
              {filteredInstitutions.length !== 1
                ? "s"
                : ""}{" "}
              displayed
            </p>
          </div>
        </div>

        {loading ? (
          <div className="institutions-loading">
            <div className="loading-spinner"></div>

            <p>Loading institutions...</p>
          </div>
        ) : filteredInstitutions.length === 0 ? (
          <div className="institutions-empty">
            <div>🏢</div>

            <h3>No institutions found</h3>

            <p>
              Try changing your search or filters, or
              add a new institution.
            </p>
          </div>
        ) : (
          <div className="institutions-table-wrapper">
            <table className="institutions-table">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredInstitutions.map(
                  (institution) => (
                    <tr key={institution.id}>
                      <td>
                        <div className="institution-name-cell">
                          <div className="institution-logo">
                            {institution.logo_url ? (
                              <img
                                src={
                                  institution.logo_url
                                }
                                alt={
                                  institution.name
                                }
                              />
                            ) : (
                              <span>
                                {institution.name
                                  ?.charAt(0)
                                  ?.toUpperCase() ||
                                  "I"}
                              </span>
                            )}
                          </div>

                          <div>
                            <strong>
                              {institution.name}
                            </strong>

                            <small>
                              {institution.email ||
                                "No email"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="type-badge">
                          {institution.institution_type ||
                            "Other"}
                        </span>
                      </td>

                      <td>
                        <div className="contact-cell">
                          <span>
                            {institution.phone ||
                              "No phone"}
                          </span>

                          <small>
                            {institution.address ||
                              "No address"}
                          </small>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            institution.is_active
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          <span></span>

                          {institution.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td>
                        {institution.created_at
                          ? new Date(
                              institution.created_at
                            ).toLocaleDateString()
                          : "—"}
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="view-btn"
                            onClick={() =>
                              loadInstitutionDetails(
                                institution
                              )
                            }
                            title="View institution"
                          >
                            👁️
                          </button>

                          <button
                            className="edit-btn"
                            onClick={() =>
                              openEditModal(
                                institution
                              )
                            }
                            title="Edit institution"
                          >
                            ✏️
                          </button>

                          <button
                            className={
                              institution.is_active
                                ? "deactivate-btn"
                                : "activate-btn"
                            }
                            onClick={() =>
                              toggleInstitutionStatus(
                                institution
                              )
                            }
                            title={
                              institution.is_active
                                ? "Deactivate"
                                : "Activate"
                            }
                          >
                            {institution.is_active
                              ? "⏸️"
                              : "▶️"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="institution-modal-overlay">
          <div className="institution-modal">
            <div className="modal-header">
              <div>
                <span className="page-eyebrow">
                  {editingInstitution
                    ? "EDIT INSTITUTION"
                    : "NEW INSTITUTION"}
                </span>

                <h2>
                  {editingInstitution
                    ? "Edit Institution"
                    : "Add Institution"}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="institution-form">
              <div className="form-group">
                <label>Institution Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Enter institution name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Institution Type *</label>
                <select
                  name="institution_type"
                  value={form.institution_type}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select institution type</option>
                  <option value="primary">Primary School</option>
                  <option value="secondary">Secondary School</option>
                  <option value="college">College</option>
                  <option value="tvet">TVET</option>
                  <option value="university">University</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="institution@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    placeholder="+254..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleFormChange}
                  placeholder="Institution address"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Logo URL</label>
                <input
                  type="url"
                  name="logo_url"
                  value={form.logo_url}
                  onChange={handleFormChange}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              {message && (
                <div className="form-message">
                  {message}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingInstitution
                    ? "Update Institution"
                    : "Add Institution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedInstitution && (
        <div className="institution-modal-overlay">
          <div className="institution-details-modal">
            <div className="modal-header">
              <div>
                <span className="page-eyebrow">
                  INSTITUTION DETAILS
                </span>

                <h2>{selectedInstitution.name}</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeDetails}
              >
                ×
              </button>
            </div>

            {loadingDetails ? (
              <div className="institutions-loading">
                <div className="loading-spinner"></div>
                <p>Loading institution details...</p>
              </div>
            ) : (
              <div className="institution-details-content">
                <div className="institution-details-top">
                  <div className="details-logo">
                    {selectedInstitution.logo_url ? (
                      <img
                        src={selectedInstitution.logo_url}
                        alt={selectedInstitution.name}
                      />
                    ) : (
                      <span>
                        {selectedInstitution.name
                          ?.charAt(0)
                          ?.toUpperCase() || "I"}
                      </span>
                    )}
                  </div>

                  <div className="details-main">
                    <h3>{selectedInstitution.name}</h3>

                    <span className="type-badge">
                      {selectedInstitution.institution_type ||
                        "Other"}
                    </span>

                    <span
                      className={`status-badge ${
                        selectedInstitution.is_active
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      <span></span>

                      {selectedInstitution.is_active
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="institution-contact-details">
                  <div>
                    <small>Email</small>
                    <strong>
                      {selectedInstitution.email ||
                        "No email provided"}
                    </strong>
                  </div>

                  <div>
                    <small>Phone</small>
                    <strong>
                      {selectedInstitution.phone ||
                        "No phone provided"}
                    </strong>
                  </div>

                  <div>
                    <small>Address</small>
                    <strong>
                      {selectedInstitution.address ||
                        "No address provided"}
                    </strong>
                  </div>

                  <div>
                    <small>Registered</small>
                    <strong>
                      {selectedInstitution.created_at
                        ? new Date(
                            selectedInstitution.created_at
                          ).toLocaleDateString()
                        : "—"}
                    </strong>
                  </div>
                </div>

                <div className="institution-stats-grid">
                  <div className="institution-stat-card">
                    <span>🏢</span>
                    <small>Departments</small>
                    <strong>
                      {institutionStats?.departments ?? 0}
                    </strong>
                  </div>

                  <div className="institution-stat-card">
                    <span>📚</span>
                    <small>Programmes</small>
                    <strong>
                      {institutionStats?.programmes ?? 0}
                    </strong>
                  </div>

                  <div className="institution-stat-card">
                    <span>👨‍🏫</span>
                    <small>Staff</small>
                    <strong>
                      {institutionStats?.staff ?? 0}
                    </strong>
                  </div>

                  <div className="institution-stat-card">
                    <span>🎓</span>
                    <small>Students</small>
                    <strong>
                      {institutionStats?.students ?? 0}
                    </strong>
                  </div>

                  <div className="institution-stat-card">
                    <span>🏫</span>
                    <small>Classes</small>
                    <strong>
                      {institutionStats?.classes ?? 0}
                    </strong>
                  </div>

                  <div className="institution-stat-card">
                    <span>📖</span>
                    <small>Academic Units</small>
                    <strong>
                      {institutionStats?.academicUnits ?? 0}
                    </strong>
                  </div>
                </div>

                <div className="administrators-section">
                  <div className="section-heading">
                    <div>
                      <h3>Institution Administrators</h3>
                      <p>
                        Administrators currently assigned to
                        this institution.
                      </p>
                    </div>

                    <span className="admin-count">
                      {administrators.length}
                    </span>
                  </div>

                  {administrators.length === 0 ? (
                    <div className="administrators-empty">
                      <span>👤</span>
                      <p>
                        No institution administrators have
                        been assigned yet.
                      </p>
                    </div>
                  ) : (
                    <div className="administrators-list">
                      {administrators.map((admin) => (
                        <div
                          className="administrator-item"
                          key={admin.user_id}
                        >
                          <div className="administrator-avatar">
                            👤
                          </div>

                          <div>
                            <strong>
                              {admin.user_id}
                            </strong>

                            <small>
                              {admin.is_active
                                ? "Active administrator"
                                : "Inactive administrator"}
                            </small>
                          </div>

                          <span
                            className={`status-badge ${
                              admin.is_active
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            <span></span>

                            {admin.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="details-actions">
                  <button
                    type="button"
                    className="edit-details-btn"
                    onClick={() => {
                      closeDetails();
                      openEditModal(selectedInstitution);
                    }}
                  >
                    ✏️ Edit Institution
                  </button>

                  <button
                    type="button"
                    className={
                      selectedInstitution.is_active
                        ? "deactivate-details-btn"
                        : "activate-details-btn"
                    }
                    onClick={() => {
                      const institution =
                        selectedInstitution;

                      closeDetails();
                      toggleInstitutionStatus(institution);
                    }}
                  >
                    {selectedInstitution.is_active
                      ? "⏸️ Deactivate Institution"
                      : "▶️ Activate Institution"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Institutions;