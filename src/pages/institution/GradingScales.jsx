import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import "./GradingScales.css";

const emptyGrade = {
  grade: "",
  min_score: "",
  max_score: "",
  points: "",
  remark: "",
};

const emptyScale = {
  name: "",
  description: "",
  applies_to: "all",
};

export default function GradingScales() {
  const [user, setUser] = useState(null);
  const [institutionId, setInstitutionId] = useState(null);

  const [scales, setScales] = useState([]);
  const [selectedScale, setSelectedScale] = useState(null);
  const [items, setItems] = useState([]);

  const [scaleForm, setScaleForm] = useState(emptyScale);
  const [gradeForm, setGradeForm] = useState(emptyGrade);

  const [showScaleForm, setShowScaleForm] = useState(false);
  const [showGradeForm, setShowGradeForm] = useState(false);

  const [editingScaleId, setEditingScaleId] = useState(null);
  const [editingGradeId, setEditingGradeId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!currentUser) {
        throw new Error("You are not logged in.");
      }

      setUser(currentUser);

      const { data: membership, error: membershipError } = await supabase
        .from("institution_members")
        .select("institution_id, role, is_active")
        .eq("user_id", currentUser.id)
        .eq("role", "institution_admin")
        .eq("is_active", true)
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership) {
        throw new Error(
          "You do not have an active institution administrator account."
        );
      }

      setInstitutionId(membership.institution_id);

      await loadScales(membership.institution_id);
    } catch (err) {
      setError(err.message || "Failed to load grading scales.");
    } finally {
      setLoading(false);
    }
  }

  async function loadScales(id = institutionId) {
    if (!id) return;

    const { data, error: scalesError } = await supabase
      .from("grading_scales")
      .select("*")
      .eq("institution_id", id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (scalesError) throw scalesError;

    setScales(data || []);

    if (selectedScale) {
      const updated = (data || []).find(
        (scale) => scale.id === selectedScale.id
      );

      if (updated) {
        setSelectedScale(updated);
        await loadItems(updated.id);
      }
    }
  }

  async function loadItems(scaleId) {
    const { data, error: itemsError } = await supabase
      .from("grading_scale_items")
      .select("*")
      .eq("grading_scale_id", scaleId)
      .order("min_score", { ascending: false });

    if (itemsError) throw itemsError;

    setItems(data || []);
  }

  function clearMessage() {
    setError("");
    setMessage("");
  }

  function openCreateScale() {
    clearMessage();
    setEditingScaleId(null);
    setScaleForm(emptyScale);
    setShowScaleForm(true);
  }

  function openEditScale(scale) {
    clearMessage();

    setEditingScaleId(scale.id);
    setScaleForm({
      name: scale.name || "",
      description: scale.description || "",
      applies_to: scale.applies_to || "all",
    });

    setShowScaleForm(true);
  }

  async function saveScale(event) {
    event.preventDefault();

    if (!institutionId) return;

    if (!scaleForm.name.trim()) {
      setError("Grading scale name is required.");
      return;
    }

    setSaving(true);
    clearMessage();

    try {
      if (editingScaleId) {
        const { error: updateError } = await supabase
          .from("grading_scales")
          .update({
            name: scaleForm.name.trim(),
            description: scaleForm.description.trim() || null,
            applies_to: scaleForm.applies_to,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingScaleId)
          .eq("institution_id", institutionId);

        if (updateError) throw updateError;

        setMessage("Grading scale updated successfully.");
      } else {
        const { data, error: insertError } = await supabase
          .from("grading_scales")
          .insert({
            institution_id: institutionId,
            name: scaleForm.name.trim(),
            description: scaleForm.description.trim() || null,
            applies_to: scaleForm.applies_to,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setMessage("Grading scale created successfully.");

        if (data) {
          setSelectedScale(data);
          setItems([]);
        }
      }

      setScaleForm(emptyScale);
      setEditingScaleId(null);
      setShowScaleForm(false);

      await loadScales(institutionId);
    } catch (err) {
      setError(err.message || "Failed to save grading scale.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteScale(scale) {
    const confirmed = window.confirm(
      `Delete "${scale.name}"? All grades inside this grading scale will also be deleted.`
    );

    if (!confirmed) return;

    clearMessage();

    try {
      const { error: deleteError } = await supabase
        .from("grading_scales")
        .delete()
        .eq("id", scale.id)
        .eq("institution_id", institutionId);

      if (deleteError) throw deleteError;

      if (selectedScale?.id === scale.id) {
        setSelectedScale(null);
        setItems([]);
      }

      setMessage("Grading scale deleted successfully.");
      await loadScales(institutionId);
    } catch (err) {
      setError(err.message || "Failed to delete grading scale.");
    }
  }

  async function toggleScale(scale) {
    clearMessage();

    try {
      const { error: updateError } = await supabase
        .from("grading_scales")
        .update({
          is_active: !scale.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scale.id)
        .eq("institution_id", institutionId);

      if (updateError) throw updateError;

      setMessage(
        scale.is_active
          ? "Grading scale deactivated."
          : "Grading scale activated."
      );

      await loadScales(institutionId);
    } catch (err) {
      setError(err.message || "Failed to update grading scale.");
    }
  }

  async function setDefaultScale(scale) {
    clearMessage();

    try {
      const { error: clearError } = await supabase
        .from("grading_scales")
        .update({
          is_default: false,
          updated_at: new Date().toISOString(),
        })
        .eq("institution_id", institutionId);

      if (clearError) throw clearError;

      const { error: defaultError } = await supabase
        .from("grading_scales")
        .update({
          is_default: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scale.id)
        .eq("institution_id", institutionId);

      if (defaultError) throw defaultError;

      setMessage(`"${scale.name}" is now the default grading scale.`);

      await loadScales(institutionId);
    } catch (err) {
      setError(err.message || "Failed to set default grading scale.");
    }
  }

  async function selectScale(scale) {
    clearMessage();

    setSelectedScale(scale);
    setItems([]);

    try {
      await loadItems(scale.id);
    } catch (err) {
      setError(err.message || "Failed to load grading rules.");
    }
  }

  function openCreateGrade() {
    if (!selectedScale) {
      setError("Select a grading scale first.");
      return;
    }

    clearMessage();

    setEditingGradeId(null);
    setGradeForm(emptyGrade);
    setShowGradeForm(true);
  }

  function openEditGrade(item) {
    clearMessage();

    setEditingGradeId(item.id);
    setGradeForm({
      grade: item.grade || "",
      min_score: item.min_score ?? "",
      max_score: item.max_score ?? "",
      points: item.points ?? "",
      remark: item.remark || "",
    });

    setShowGradeForm(true);
  }

  function validateGrade() {
    const min = Number(gradeForm.min_score);
    const max = Number(gradeForm.max_score);

    if (!gradeForm.grade.trim()) {
      return "Grade is required.";
    }

    if (
      gradeForm.min_score === "" ||
      gradeForm.max_score === "" ||
      Number.isNaN(min) ||
      Number.isNaN(max)
    ) {
      return "Minimum and maximum scores are required.";
    }

    if (min < 0 || max > 100) {
      return "Scores must be between 0 and 100.";
    }

    if (min > max) {
      return "Minimum score cannot be greater than maximum score.";
    }

    if (gradeForm.points !== "" && Number(gradeForm.points) < 0) {
      return "Points cannot be negative.";
    }

    return null;
  }

  async function saveGrade(event) {
    event.preventDefault();

    if (!selectedScale) return;

    const validationError = validateGrade();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    clearMessage();

    const payload = {
      grading_scale_id: selectedScale.id,
      grade: gradeForm.grade.trim(),
      min_score: Number(gradeForm.min_score),
      max_score: Number(gradeForm.max_score),
      points:
        gradeForm.points === "" ? null : Number(gradeForm.points),
      remark: gradeForm.remark.trim() || null,
    };

    try {
      if (editingGradeId) {
        const { error: updateError } = await supabase
          .from("grading_scale_items")
          .update(payload)
          .eq("id", editingGradeId)
          .eq("grading_scale_id", selectedScale.id);

        if (updateError) throw updateError;

        setMessage("Grade updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("grading_scale_items")
          .insert(payload);

        if (insertError) throw insertError;

        setMessage("Grade added successfully.");
      }

      setGradeForm(emptyGrade);
      setEditingGradeId(null);
      setShowGradeForm(false);

      await loadItems(selectedScale.id);
    } catch (err) {
      if (err.code === "23505") {
        setError("This grade already exists in the selected scale.");
      } else {
        setError(err.message || "Failed to save grade.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteGrade(item) {
    const confirmed = window.confirm(
      `Delete grade "${item.grade}" from this grading scale?`
    );

    if (!confirmed) return;

    clearMessage();

    try {
      const { error: deleteError } = await supabase
        .from("grading_scale_items")
        .delete()
        .eq("id", item.id)
        .eq("grading_scale_id", selectedScale.id);

      if (deleteError) throw deleteError;

      setMessage("Grade deleted successfully.");
      await loadItems(selectedScale.id);
    } catch (err) {
      setError(err.message || "Failed to delete grade.");
    }
  }

  const coverage = useMemo(() => {
    if (!items.length) return null;

    const sorted = [...items].sort(
      (a, b) => Number(a.min_score) - Number(b.min_score)
    );

    const lowest = Number(sorted[0].min_score);
    const highest = Number(
      sorted[sorted.length - 1].max_score
    );

    return {
      lowest,
      highest,
      complete: lowest === 0 && highest === 100,
    };
  }, [items]);

  if (loading) {
    return (
      <div className="grading-page">
        <div className="grading-loading">
          Loading grading scales...
        </div>
      </div>
    );
  }

  return (
    <div className="grading-page">
      <div className="grading-container">

        <div className="grading-header">
          <div>
            <div className="grading-breadcrumb">
              Institution / Results / Grading Scales
            </div>

            <h1>Grading Scales</h1>

            <p>
              Configure how your institution converts scores into
              grades, points and performance remarks.
            </p>
          </div>

          <button
            type="button"
            className="grading-primary-button"
            onClick={openCreateScale}
          >
            + New Grading Scale
          </button>
        </div>

        {error && (
          <div className="grading-alert grading-alert-error">
            {error}
          </div>
        )}

        {message && (
          <div className="grading-alert grading-alert-success">
            {message}
          </div>
        )}

        <div className="grading-layout">

          <section className="grading-panel grading-scales-panel">
            <div className="grading-panel-header">
              <div>
                <h2>Grading Scales</h2>
                <p>
                  {scales.length} scale
                  {scales.length === 1 ? "" : "s"} configured
                </p>
              </div>
            </div>

            <div className="grading-scale-list">
              {scales.length === 0 ? (
                <div className="grading-empty">
                  <div className="grading-empty-icon">📊</div>
                  <h3>No grading scales yet</h3>
                  <p>
                    Create your first grading scale to begin
                    configuring results.
                  </p>
                </div>
              ) : (
                scales.map((scale) => (
                  <button
                    type="button"
                    key={scale.id}
                    className={`grading-scale-card ${
                      selectedScale?.id === scale.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => selectScale(scale)}
                  >
                    <div className="grading-scale-card-top">
                      <div>
                        <h3>{scale.name}</h3>

                        <p>
                          {scale.description ||
                            "No description provided."}
                        </p>
                      </div>

                      {scale.is_default && (
                        <span className="grading-default-badge">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="grading-scale-meta">
                      <span>
                        Applies to:{" "}
                        {scale.applies_to === "all"
                          ? "All"
                          : scale.applies_to.toUpperCase()}
                      </span>

                      <span
                        className={
                          scale.is_active
                            ? "grading-active"
                            : "grading-inactive"
                        }
                      >
                        {scale.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="grading-panel grading-rules-panel">
            {!selectedScale ? (
              <div className="grading-empty grading-empty-large">
                <div className="grading-empty-icon">🎓</div>
                <h3>Select a grading scale</h3>
                <p>
                  Select a scale from the left to view and manage
                  its grading rules.
                </p>
              </div>
            ) : (
              <>
                <div className="grading-panel-header grading-rules-header">
                  <div>
                    <div className="grading-title-row">
                      <h2>{selectedScale.name}</h2>

                      {selectedScale.is_default && (
                        <span className="grading-default-badge">
                          Default
                        </span>
                      )}
                    </div>

                    <p>
                      {selectedScale.description ||
                        "Configure score ranges and grade points."}
                    </p>
                  </div>

                  <div className="grading-header-actions">
                    <button
                      type="button"
                      className="grading-secondary-button"
                      onClick={() =>
                        openEditScale(selectedScale)
                      }
                    >
                      Edit
                    </button>

                    {!selectedScale.is_default && (
                      <button
                        type="button"
                        className="grading-secondary-button"
                        onClick={() =>
                          setDefaultScale(selectedScale)
                        }
                      >
                        Set Default
                      </button>
                    )}

                    <button
                      type="button"
                      className="grading-secondary-button"
                      onClick={() =>
                        toggleScale(selectedScale)
                      }
                    >
                      {selectedScale.is_active
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                    <button
                      type="button"
                      className="grading-danger-button"
                      onClick={() =>
                        deleteScale(selectedScale)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grading-rules-toolbar">
                  <div>
                    <strong>{items.length}</strong>{" "}
                    grading rule
                    {items.length === 1 ? "" : "s"}
                  </div>

                  <button
                    type="button"
                    className="grading-primary-button"
                    onClick={openCreateGrade}
                  >
                    + Add Grade
                  </button>
                </div>

                {coverage && (
                  <div
                    className={`grading-coverage ${
                      coverage.complete
                        ? "complete"
                        : "incomplete"
                    }`}
                  >
                    <strong>
                      {coverage.complete
                        ? "✓ Score range covered"
                        : "⚠️ Score range incomplete"}
                    </strong>

                    <span>
                      Current coverage: {coverage.lowest}–
                      {coverage.highest}
                    </span>
                  </div>
                )}

                {items.length === 0 ? (
                  <div className="grading-empty">
                    <div className="grading-empty-icon">A</div>
                    <h3>No grading rules</h3>
                    <p>
                      Add grades such as A, B, C, D or your
                      institution's preferred grading system.
                    </p>
                  </div>
                ) : (
                  <div className="grading-table-wrapper">
                    <table className="grading-table">
                      <thead>
                        <tr>

                          <th>Grade</th>
      <th>Score Range</th>
      <th>Points</th>
      <th>Remark</th>
      <th>Actions</th>
    </tr>
  </thead>

  <tbody>
    {items.map((item) => (
      <tr key={item.id}>
        <td>
          <span className="grading-letter">
            {item.grade}
          </span>
        </td>

        <td>
          {item.min_score} – {item.max_score}
        </td>

        <td>
          {item.points ?? "—"}
        </td>

        <td>
          {item.remark || "—"}
        </td>

        <td>
          <div className="grading-row-actions">
            <button
              type="button"
              onClick={() => openEditGrade(item)}
            >
              Edit
            </button>

            <button
              type="button"
              className="delete"
              onClick={() => deleteGrade(item)}
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    ))}
  </tbody>
</table>
</div>
)}
</>
)}
</section>
</div>

{/* CREATE / EDIT GRADING SCALE MODAL */}
{showScaleForm && (
  <div className="grading-modal-backdrop">
    <div className="grading-modal">
      <div className="grading-modal-header">
        <div>
          <h2>
            {editingScaleId
              ? "Edit Grading Scale"
              : "Create Grading Scale"}
          </h2>

          <p>
            Define the grading system used by your institution.
          </p>
        </div>

        <button
          type="button"
          className="grading-close-button"
          onClick={() => setShowScaleForm(false)}
        >
          ×
        </button>
      </div>

      <form onSubmit={saveScale}>
        <div className="grading-form-grid">
          <label>
            Scale Name

            <input
              type="text"
              value={scaleForm.name}
              onChange={(event) =>
                setScaleForm({
                  ...scaleForm,
                  name: event.target.value,
                })
              }
              placeholder="e.g. Standard Secondary Grading"
              required
            />
          </label>

          <label>
            Applies To

            <select
              value={scaleForm.applies_to}
              onChange={(event) =>
                setScaleForm({
                  ...scaleForm,
                  applies_to: event.target.value,
                })
              }
            >
              <option value="all">All</option>
              <option value="school">School</option>
              <option value="university">
                University
              </option>
              <option value="college">College</option>
              <option value="tvet">TVET</option>
            </select>
          </label>

          <label className="grading-full-width">
            Description

            <textarea
              value={scaleForm.description}
              onChange={(event) =>
                setScaleForm({
                  ...scaleForm,
                  description: event.target.value,
                })
              }
              placeholder="Briefly describe this grading system..."
              rows="4"
            />
          </label>
        </div>

        <div className="grading-modal-actions">
          <button
            type="button"
            className="grading-secondary-button"
            onClick={() => setShowScaleForm(false)}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="grading-primary-button"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingScaleId
              ? "Update Scale"
              : "Create Scale"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* CREATE / EDIT GRADE MODAL */}
{showGradeForm && selectedScale && (
  <div className="grading-modal-backdrop">
    <div className="grading-modal grading-grade-modal">
      <div className="grading-modal-header">
        <div>
          <h2>
            {editingGradeId
              ? "Edit Grade"
              : "Add Grade"}
          </h2>

          <p>
            Add a score range to{" "}
            <strong>{selectedScale.name}</strong>.
          </p>
        </div>

        <button
          type="button"
          className="grading-close-button"
          onClick={() => setShowGradeForm(false)}
        >
          ×
        </button>
      </div>

      <form onSubmit={saveGrade}>
        <div className="grading-form-grid">
          <label>
            Grade

            <input
              type="text"
              value={gradeForm.grade}
              onChange={(event) =>
                setGradeForm({
                  ...gradeForm,
                  grade: event.target.value,
                })
              }
              placeholder="e.g. A"
              required
            />
          </label>

          <label>
            Points

            <input
              type="number"
              min="0"
              step="0.01"
              value={gradeForm.points}
              onChange={(event) =>
                setGradeForm({
                  ...gradeForm,
                  points: event.target.value,
                })
              }
              placeholder="e.g. 12"
            />
          </label>

          <label>
            Minimum Score

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={gradeForm.min_score}
              onChange={(event) =>
                setGradeForm({
                  ...gradeForm,
                  min_score: event.target.value,
                })
              }
              placeholder="0"
              required
            />
          </label>

          <label>
            Maximum Score

            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={gradeForm.max_score}
              onChange={(event) =>
                setGradeForm({
                  ...gradeForm,
                  max_score: event.target.value,
                })
              }
              placeholder="100"
              required
            />
          </label>

          <label className="grading-full-width">
            Remark

            <input
              type="text"
              value={gradeForm.remark}
              onChange={(event) =>
                setGradeForm({
                  ...gradeForm,
                  remark: event.target.value,
                })
              }
              placeholder="e.g. Excellent"
            />
          </label>
        </div>

        <div className="grading-modal-actions">
          <button
            type="button"
            className="grading-secondary-button"
            onClick={() => setShowGradeForm(false)}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="grading-primary-button"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingGradeId
              ? "Update Grade"
              : "Add Grade"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
      </div>
    </div>
  );
}