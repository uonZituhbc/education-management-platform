import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import "./ResultProcessing.css";

export default function ResultProcessing() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [institution, setInstitution] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [scales, setScales] = useState([]);

  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [selectedScaleId, setSelectedScaleId] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedSubmission = useMemo(
    () =>
      submissions.find(
        (submission) => submission.id === selectedSubmissionId
      ) || null,
    [submissions, selectedSubmissionId]
  );

  const selectedScale = useMemo(
    () => scales.find((scale) => scale.id === selectedScaleId) || null,
    [scales, selectedScaleId]
  );

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("You are not logged in.");
      }

      const { data: membership, error: membershipError } = await supabase
        .from("institution_members")
        .select("institution_id, role, is_active")
        .eq("user_id", user.id)
        .eq("role", "institution_admin")
        .eq("is_active", true)
        .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership) {
        throw new Error(
          "You do not have an active institution administrator account."
        );
      }

      const { data: institutionData, error: institutionError } =
        await supabase
          .from("institutions")
          .select("*")
          .eq("id", membership.institution_id)
          .maybeSingle();

      if (institutionError) throw institutionError;

      setInstitution(institutionData);

      await Promise.all([
        loadApprovedSubmissions(membership.institution_id),
        loadGradingScales(membership.institution_id),
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load result processing data.");
    } finally {
      setLoading(false);
    }
  }

  async function loadApprovedSubmissions(institutionId) {
    const { data, error: submissionsError } = await supabase
      .from("mark_submissions")
      .select(`
        id,
        assignment_id,
        status,
        submitted_at,
        reviewed_at,
        review_comment,

        staff_teaching_assignments (
          id,
          academic_year,
          term,
          staff_id,
          department_id,
          programme_id,
          academic_unit_id,
          class_id,

          staff!fk_assignment_staff_same_institution (
            id,
            full_name,
            staff_number
          ),

          departments!fk_assignment_department_same_institution (
            id,
            name,
            code
          ),

          programmes!fk_assignment_programme_same_institution (
            id,
            name,
            code
          ),

          academic_units!fk_assignment_academic_unit_same_institution (
            id,
            name,
            code,
            unit_type
          ),

          classes!fk_assignment_class_same_institution (
            id,
            name,
            academic_year,
            term
          )
        )
      `)
      .eq("institution_id", institutionId)
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false });

    if (submissionsError) {
      throw submissionsError;
    }

    setSubmissions(data || []);
  }

  async function loadGradingScales(institutionId) {
    const { data, error: scalesError } = await supabase
      .from("grading_scales")
      .select(`
        id,
        name,
        description,
        applies_to,
        is_default,
        is_active
      `)
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (scalesError) {
      throw scalesError;
    }

    setScales(data || []);

    const defaultScale = (data || []).find((scale) => scale.is_default);

    if (defaultScale) {
      setSelectedScaleId(defaultScale.id);
    }
  }

  function getAssignmentLabel(submission) {
    const assignment = submission?.staff_teaching_assignments;

    if (!assignment) {
      return "Unknown assignment";
    }

    const unit = assignment.academic_units?.name || "Academic Unit";

    const code = assignment.academic_units?.code
      ? ` (${assignment.academic_units.code})`
      : "";

    const className = assignment.classes?.name
      ? ` • ${assignment.classes.name}`
      : "";

    const programme = assignment.programmes?.name
      ? ` • ${assignment.programmes.name}`
      : "";

    return `${unit}${code}${className}${programme}`;
  }

  function getSubmissionMeta(submission) {
    const assignment = submission?.staff_teaching_assignments;

    if (!assignment) {
      return "";
    }

    const staff = assignment.staff?.full_name || "Unknown staff";
    const year = assignment.academic_year || "";
    const term = assignment.term || "";

    return [staff, year, term].filter(Boolean).join(" • ");
  }

  async function processResults() {
    setError("");
    setMessage("");

    if (!selectedSubmissionId) {
      setError("Please select an approved submission.");
      return;
    }

    if (!selectedScaleId) {
      setError("Please select a grading scale.");
      return;
    }

    if (!institution?.id) {
      setError("Institution information is unavailable.");
      return;
    }

    setProcessing(true);

    try {
      const submission = selectedSubmission;

      if (!submission) {
        throw new Error("The selected submission could not be found.");
      }

      if (submission.status !== "approved") {
        throw new Error(
          "Only approved submissions can be processed into official results."
        );
      }

      const assignment = submission.staff_teaching_assignments;

      if (!assignment) {
        throw new Error("The teaching assignment could not be found.");
      }

      /*
       * Load the grading ranges.
       */
      const { data: scaleItems, error: scaleItemsError } = await supabase
        .from("grading_scale_items")
        .select(`
          id,
          grading_scale_id,
          grade,
          min_score,
          max_score,
          points,
          remark
        `)
        .eq("grading_scale_id", selectedScaleId)
        .order("min_score", { ascending: true });

      if (scaleItemsError) {
        throw scaleItemsError;
      }

      if (!scaleItems || scaleItems.length === 0) {
        throw new Error(
          "The selected grading scale has no grading ranges configured."
        );
      }

      /*
       * Load marks belonging to this approved assignment.
       */
      const { data: marks, error: marksError } = await supabase
        .from("marks")
        .select(`
          id,
          institution_id,
          assignment_id,
          student_id,
          academic_unit_id,
          class_id,
          score,
          remarks,
          students (
            id,
            admission_number,
            first_name,
            middle_name,
            last_name
          )
        `)
        .eq("institution_id", institution.id)
        .eq("assignment_id", submission.assignment_id);

      if (marksError) {
        throw marksError;
      }

      if (!marks || marks.length === 0) {
        throw new Error(
          "No marks were found for this approved submission."
        );
      }

      /*
       * Convert every raw score into a grade.
       */
      const processedRows = [];

      for (const mark of marks) {
        const score = Number(mark.score);

        if (!Number.isFinite(score) || score < 0 || score > 100) {
          throw new Error(
            `Invalid score detected for student ${
              mark.students?.admission_number || mark.student_id
            }.`
          );
        }

        const matchingItem = scaleItems.find(
          (item) =>
            score >= Number(item.min_score) &&
            score <= Number(item.max_score)
        );

        if (!matchingItem) {
          throw new Error(
            `No grading range covers score ${score} for student ${
              mark.students?.admission_number || mark.student_id
            }.`
          );
        }

        processedRows.push({
          institution_id: institution.id,
          student_id: mark.student_id,
          mark_id: mark.id,
          assignment_id: mark.assignment_id,
          academic_unit_id: mark.academic_unit_id,
          class_id: mark.class_id || null,
          grading_scale_id: selectedScaleId,
          grading_scale_item_id: matchingItem.id,
          score,
          grade: matchingItem.grade,
          points:
            matchingItem.points === null ||
            matchingItem.points === undefined
              ? null
              : Number(matchingItem.points),
          remark: matchingItem.remark || mark.remarks || null,
        });
      }

      /*
       * Save processed results.
       */
      const { error: upsertError } = await supabase
        .from("student_results")
        .upsert(processedRows, {
          onConflict: "student_id,mark_id",
        });

      if (upsertError) {
        throw upsertError;
      }

      setMessage(
        `Successfully processed ${processedRows.length} result${
          processedRows.length === 1 ? "" : "s"
        } using "${
          selectedScale?.name || "the selected grading scale"
        }".`
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to process results.");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="result-processing-page">
        <div className="processing-loading">
          <div className="processing-spinner" />
          <p>Loading result processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="result-processing-page">
      <div className="result-processing-header">
        <div>
          <span className="processing-eyebrow">ACADEMIC RESULTS</span>

          <h1>Result Processing</h1>

          <p>
            Convert approved marks into official grades, points and remarks
            using your institution's grading scale.
          </p>
        </div>

        <div className="processing-status">
          <span className="status-dot" />
          Admin Mode
        </div>
      </div>

      {error && (
        <div className="processing-alert processing-alert-error">
          <strong>Unable to process</strong>
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="processing-alert processing-alert-success">
          <strong>Results processed</strong>
          <span>{message}</span>
        </div>
      )}

      <div className="processing-grid">
        <section className="processing-card">
          <div className="processing-card-header">
            <div>
              <h2>1. Select approved marks</h2>

              <p>
                Only marks that have been approved by an institution admin are
                available here.
              </p>
            </div>

            <span className="processing-count">
              {submissions.length} approved
            </span>
          </div>

          {submissions.length === 0 ? (
            <div className="processing-empty">
              <div className="empty-icon">✓</div>

              <h3>No approved submissions</h3>

              <p>
                Once staff submit marks and an administrator approves them,
                they will appear here for processing.
              </p>
            </div>
          ) : (
            <div className="submission-list">
              {submissions.map((submission) => {
                const selected =
                  submission.id === selectedSubmissionId;

                return (
                  <button
                    key={submission.id}
                    type="button"
                    className={`submission-option ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() =>
                      setSelectedSubmissionId(submission.id)
                    }
                  >
                    <div className="submission-option-main">
                      <div className="submission-unit">
                        {getAssignmentLabel(submission)}
                      </div>

                      <div className="submission-meta">
                        {getSubmissionMeta(submission)}
                      </div>
                    </div>

                    <div className="submission-check">
                      {selected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="processing-card">
          <div className="processing-card-header">
            <div>
              <h2>2. Select grading scale</h2>

              <p>
                The selected scale determines the grade, points and remark
                assigned to every score.
              </p>
            </div>
          </div>

          {scales.length === 0 ? (
            <div className="processing-empty">
              <div className="empty-icon">!</div>

              <h3>No active grading scale</h3>

              <p>
                Create and activate a grading scale before processing results.
              </p>
            </div>
          ) : (
            <div className="scale-list">
              {scales.map((scale) => {
                const selected = scale.id === selectedScaleId;

                return (
                  <button
                    key={scale.id}
                    type="button"
                    className={`scale-option ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() => setSelectedScaleId(scale.id)}
                  >
                    <div>
                      <div className="scale-name">
                        {scale.name}

                        {scale.is_default && (
                          <span className="default-badge">
                            Default
                          </span>
                        )}
                      </div>

                      <div className="scale-description">
                        {scale.description ||
                          `Applies to ${
                            scale.applies_to || "institution"
                          }`}
                      </div>
                    </div>

                    <div className="scale-check">
                      {selected ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="processing-card processing-preview-card">
        <div className="processing-card-header">
          <div>
            <h2>Processing summary</h2>

            <p>
              Review what EMP is about to process.
            </p>
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-item">
            <span>Submission</span>

            <strong>
              {selectedSubmission
                ? getAssignmentLabel(selectedSubmission)
                : "Not selected"}
            </strong>
          </div>

          <div className="summary-item">
            <span>Staff</span>

            <strong>
              {selectedSubmission?.staff_teaching_assignments?.staff
                ?.full_name || "—"}
            </strong>
          </div>

          <div className="summary-item">
            <span>Status</span>

            <strong className="approved-text">
              {selectedSubmission?.status || "—"}
            </strong>
          </div>

          <div className="summary-item">
            <span>Grading Scale</span>

            <strong>
              {selectedScale?.name || "Not selected"}
            </strong>
          </div>
        </div>

        <div className="processing-action-area">
          <div>
            <strong>Ready to process?</strong>

            <p>
              EMP will read each approved score, find its matching grading
              range and save the official result.
            </p>
          </div>

          <button
            type="button"
            className="process-results-button"
            onClick={processResults}
            disabled={
              processing ||
              !selectedSubmissionId ||
              !selectedScaleId ||
              submissions.length === 0 ||
              scales.length === 0
            }
          >
            {processing
              ? "Processing..."
              : "⚙️ Process Results"}
          </button>
        </div>
      </section>

      <section className="processing-flow">
        <div className="flow-step">
          <span>01</span>
          <strong>Approved marks</strong>
          <small>Admin-approved submissions</small>
        </div>

        <div className="flow-arrow">→</div>

        <div className="flow-step">
          <span>02</span>
          <strong>Grading scale</strong>
          <small>Match score to range</small>
        </div>

        <div className="flow-arrow">→</div>

        <div className="flow-step">
          <span>03</span>
          <strong>Student results</strong>
          <small>Grade + points + remark</small>
        </div>

        <div className="flow-arrow">→</div>

        <div className="flow-step">
          <span>04</span>
          <strong>Reports</strong>
          <small>Report cards & transcripts</small>
        </div>
      </section>
    </div>
  );
}