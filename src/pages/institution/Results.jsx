import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import "./Results.css";

function Results() {
  const navigate = useNavigate();

  const [institution, setInstitution] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [marks, setMarks] = useState([]);

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedMarks, setSelectedMarks] = useState([]);

  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [reviewComment, setReviewComment] = useState("");

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: member, error: memberError } = await supabase
        .from("institution_members")
        .select(`
          institution_id,
          role,
          institutions (
            id,
            name,
            institution_type,
            email,
            phone,
            logo_url
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("role", "institution_admin")
        .maybeSingle();

      if (memberError) throw memberError;

      if (!member || !member.institution_id) {
        throw new Error(
          "You do not have institution administrator access."
        );
      }

      setInstitution(member.institutions);

      const { data: submissionData, error: submissionError } =
        await supabase
          .from("mark_submissions")
          .select(`
            id,
            assignment_id,
            institution_id,
            submitted_by,
            status,
            submitted_at,
            reviewed_at,
            reviewed_by,
            review_comment,
            created_at,
            updated_at,

            staff_teaching_assignments (
                id,
  institution_id,
  staff_id,
  department_id,
  programme_id,
  academic_unit_id,
  class_id,
  academic_year,
  term,
  is_active,

  staff:staff_teaching_assignments_staff_id_fkey (
    id,
    full_name,
    staff_number,
    email
  ),

  departments:staff_teaching_assignments_department_id_fkey (
    id,
    name,
    code
  ),

  programmes:staff_teaching_assignments_programme_id_fkey (
    id,
    name,
    code
  ),

  academic_units:staff_teaching_assignments_academic_unit_id_fkey (
    id,
    name,
    code,
    unit_type
  ),

  classes:staff_teaching_assignments_class_id_fkey (
    id,
    name,
    academic_year,
    term
  )
)
          `)
          .eq("institution_id", member.institution_id)
          .order("created_at", { ascending: false });

      if (submissionError) throw submissionError;

      const assignmentIds = (submissionData || [])
        .map((item) => item.assignment_id)
        .filter(Boolean);

      let markData = [];

      if (assignmentIds.length > 0) {
        const { data, error: marksError } = await supabase
          .from("marks")
          .select(`
            id,
            assignment_id,
            student_id,
            score,
            remarks,
            academic_unit_id,
            class_id,

            students (
              id,
              admission_number,
              first_name,
              middle_name,
              last_name
            )
          `)
          .in("assignment_id", assignmentIds);

        if (marksError) throw marksError;

        markData = data || [];
      }

      setSubmissions(submissionData || []);
      setMarks(markData);

      if (selectedSubmission) {
        const refreshed = (submissionData || []).find(
          (item) => item.id === selectedSubmission.id
        );

        if (refreshed) {
          setSelectedSubmission(refreshed);
        } else {
          setSelectedSubmission(null);
          setSelectedMarks([]);
        }
      }
    } catch (err) {
      console.error("Results loading error:", err);
      setError(err.message || "Failed to load results.");
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (filter === "all") {
      return submissions;
    }

    return submissions.filter(
      (submission) => submission.status === filter
    );
  }, [submissions, filter]);

  const counts = useMemo(() => {
    return {
      all: submissions.length,
      draft: submissions.filter(
        (item) => item.status === "draft"
      ).length,
      submitted: submissions.filter(
        (item) => item.status === "submitted"
      ).length,
      returned: submissions.filter(
        (item) => item.status === "returned"
      ).length,
      approved: submissions.filter(
        (item) => item.status === "approved"
      ).length,
    };
  }, [submissions]);

  const getSubmissionMarks = (assignmentId) => {
    return marks.filter(
      (mark) => mark.assignment_id === assignmentId
    );
  };

  const openSubmission = async (submission) => {
    setSelectedSubmission(submission);
    setReviewComment(submission.review_comment || "");
    setLoadingMarks(true);

    try {
      const { data, error: marksError } = await supabase
        .from("marks")
        .select(`
          id,
          assignment_id,
          student_id,
          score,
          remarks,
          academic_unit_id,
          class_id,

          students (
            id,
            admission_number,
            first_name,
            middle_name,
            last_name
          )
        `)
        .eq("assignment_id", submission.assignment_id)
        .order("student_id", { ascending: true });

      if (marksError) throw marksError;

      setSelectedMarks(data || []);
    } catch (err) {
      console.error("Marks loading error:", err);
      setError(err.message || "Failed to load student marks.");
      setSelectedMarks([]);
    } finally {
      setLoadingMarks(false);
    }
  };

  const closeSubmission = () => {
    if (processing) return;

    setSelectedSubmission(null);
    setSelectedMarks([]);
    setReviewComment("");
  };

  const handleReturn = async () => {
    if (!selectedSubmission) return;

    const comment = reviewComment.trim();

    if (!comment) {
      setError(
        "Please provide a correction comment before returning the results."
      );
      return;
    }

    const confirmed = window.confirm(
      "Return these results to the staff member for correction?"
    );

    if (!confirmed) return;

    setProcessing(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        navigate("/login");
        return;
      }

      const { error: updateError } = await supabase
        .from("mark_submissions")
        .update({
          status: "returned",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          review_comment: comment,
        })
        .eq("id", selectedSubmission.id)
        .eq("institution_id", institution.id);

      if (updateError) throw updateError;

      setMessage(
        "Results returned to the staff member for correction."
      );

      await loadResults();

      setSelectedSubmission((current) =>
        current
          ? {
              ...current,
              status: "returned",
              review_comment: comment,
            }
          : current
      );
    } catch (err) {
      console.error("Return results error:", err);
      setError(err.message || "Failed to return results.");
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    if (selectedSubmission.status !== "submitted") {
      setError(
        "Only submitted results can be approved."
      );
      return;
    }

    const confirmed = window.confirm(
      "Approve these results as official results?"
    );

    if (!confirmed) return;

    setProcessing(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        navigate("/login");
        return;
      }

      const { error: updateError } = await supabase
        .from("mark_submissions")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          review_comment: reviewComment.trim() || null,
        })
        .eq("id", selectedSubmission.id)
        .eq("institution_id", institution.id)
        .eq("status", "submitted");

      if (updateError) throw updateError;

      setMessage(
        "Results approved successfully. They are now official."
      );

      await loadResults();

      setSelectedSubmission((current) =>
        current
          ? {
              ...current,
              status: "approved",
            }
          : current
      );
    } catch (err) {
      console.error("Approve results error:", err);
      setError(err.message || "Failed to approve results.");
    } finally {
      setProcessing(false);
    }
  };

  const getStudentName = (student) => {
    if (!student) return "Unknown Student";

    return [
      student.first_name,
      student.middle_name,
      student.last_name,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const getAssignmentDetails = (submission) => {
    const assignment = submission?.staff_teaching_assignments;

    if (!assignment) {
      return {
        unit: "Unknown Unit",
        staff: "Unknown Staff",
        className: "—",
        programme: "—",
        department: "—",
        year: "—",
        term: "—",
      };
    }

    return {
      unit: assignment.academic_units
        ? `${assignment.academic_units.name}${
            assignment.academic_units.code
              ? ` (${assignment.academic_units.code})`
              : ""
          }`
        : "—",

      staff: assignment.staff?.full_name || "—",

      className: assignment.classes?.name || "—",

      programme: assignment.programmes?.name || "—",

      department: assignment.departments?.name || "—",

      year: assignment.academic_year || "—",

      term: assignment.term || "—",
    };
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "approved":
        return "results-status approved";

      case "submitted":
        return "results-status submitted";

      case "returned":
        return "results-status returned";

      case "draft":
        return "results-status draft";

      default:
        return "results-status";
    }
  };

  const getScoreClass = (score) => {
    const numericScore = Number(score);

    if (numericScore >= 70) return "score-high";
    if (numericScore >= 50) return "score-medium";

    return "score-low";
  };

  if (loading) {
    return (
      <div className="results-page">
        <div className="results-loading">
          <div className="results-spinner"></div>
          <p>Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-header">
        <div>
          <div className="results-breadcrumb">
            Dashboard / Results
          </div>

          <h1>Results Management</h1>

          <p>
            Review, return and approve marks submitted by your
            institution's teaching staff.
          </p>
        </div>

        <button
          className="results-refresh-button"
          onClick={loadResults}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="results-alert results-alert-error">
          <strong>Error</strong>
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {message && (
        <div className="results-alert results-alert-success">
          <strong>Success</strong>
          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}

      <section className="results-summary">
        <div className="results-summary-card">
          <div className="results-summary-icon">📊</div>
          <div>
            <span>Total Submissions</span>
            <strong>{counts.all}</strong>
          </div>
        </div>

        <div className="results-summary-card">
          <div className="results-summary-icon">📝</div>
          <div>
            <span>Draft</span>
            <strong>{counts.draft}</strong>
          </div>
        </div>

        <div className="results-summary-card">
          <div className="results-summary-icon">📨</div>
          <div>
            <span>Submitted</span>
            <strong>{counts.submitted}</strong>
          </div>
        </div>

        <div className="results-summary-card">
          <div className="results-summary-icon">↩️</div>
          <div>
            <span>Returned</span>
            <strong>{counts.returned}</strong>
          </div>
        </div>

        <div className="results-summary-card">
          <div className="results-summary-icon">✓</div>
          <div>
            <span>Approved</span>
            <strong>{counts.approved}</strong>
          </div>
        </div>
      </section>

      <section className="results-content">
        <div className="results-list-panel">
          <div className="results-panel-header">
            <div>
              <h2>Mark Submissions</h2>
              <p>
                Select a submission to review its student marks.
              </p>
            </div>
          </div>

          <div className="results-filters">
            {[
              ["all", "All", counts.all],
              ["submitted", "Submitted", counts.submitted],
              ["returned", "Returned", counts.returned],
              ["approved", "Approved", counts.approved],
              ["draft", "Draft", counts.draft],
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                className={
                  filter === value
                    ? "results-filter active"
                    : "results-filter"
                }
                onClick={() => setFilter(value)}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="results-empty">
              <div className="results-empty-icon">📋</div>

              <h3>No results found</h3>

              <p>
                There are no {filter === "all" ? "" : filter} mark
                submissions to display.
              </p>
            </div>
          ) : (
            <div className="results-submission-list">
              {filteredSubmissions.map((submission) => {
                const details =
                  getAssignmentDetails(submission);

                const submissionMarks = getSubmissionMarks(
                  submission.assignment_id
                );

                return (
                  <button
                    type="button"
                    key={submission.id}
                    className={
                      selectedSubmission?.id === submission.id
                        ? "submission-card selected"
                        : "submission-card"
                    }
                    onClick={() =>
                      openSubmission(submission)
                    }
                  >
                    <div className="submission-card-top">
                      <div>
                        <h3>{details.unit}</h3>

                        <p>
                          {details.staff}
                        </p>
                      </div>

                      <span
                        className={getStatusClass(
                          submission.status
                        )}
                      >
                        {submission.status}
                      </span>
                    </div>

                    <div className="submission-details">
                      <div>
                        <span>Class</span>
                        <strong>{details.className}</strong>
                      </div>

                      <div>
                        <span>Programme</span>
                        <strong>
                          {details.programme}
                        </strong>
                      </div>

                      <div>
                        <span>Academic Year</span>
                        <strong>{details.year}</strong>
                      </div>

                      <div>
                        <span>Term</span>
                        <strong>{details.term}</strong>
                      </div>
                    </div>

                    <div className="submission-footer">
                      <span>
                        👨‍🎓 {submissionMarks.length} marks
                      </span>

                      <span>
                        {submission.submitted_at
                          ? new Date(
                              submission.submitted_at
                            ).toLocaleDateString()
                          : "Not submitted"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="results-review-panel">
          {!selectedSubmission ? (
            <div className="review-placeholder">
              <div className="review-placeholder-icon">
                📊
              </div>

              <h2>Review Results</h2>

              <p>
                Select a mark submission from the list to view
                student scores and review the results.
              </p>
            </div>
          ) : (
            <>
              <div className="review-header">
                <div>
                  <span className="review-label">
                    RESULT SUBMISSION
                  </span>

                  <h2>
                    {
                      getAssignmentDetails(
                        selectedSubmission
                      ).unit
                    }
                  </h2>

                  <p>
                    {
                      getAssignmentDetails(
                        selectedSubmission
                      ).staff
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className="review-close"
                  onClick={closeSubmission}
                  disabled={processing}
                >
                  ×
                </button>
              </div>

              <div className="review-meta">
                <div>
                  <span>Class</span>
                  <strong>

                   {
                      getAssignmentDetails(
                        selectedSubmission
                      ).className
                    }
                  </strong>
                </div>

                <div>
                  <span>Programme</span>
                  <strong>
                    {
                      getAssignmentDetails(
                        selectedSubmission
                      ).programme
                    }
                  </strong>
                </div>

                <div>
                  <span>Department</span>
                  <strong>
                    {
                      getAssignmentDetails(
                        selectedSubmission
                      ).department
                    }
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong
                    className={getStatusClass(
                      selectedSubmission.status
                    )}
                  >
                    {selectedSubmission.status}
                  </strong>
                </div>
              </div>

              {selectedSubmission.review_comment && (
                <div className="previous-review">
                  <strong>Review comment</strong>
                  <p>
                    {selectedSubmission.review_comment}
                  </p>
                </div>
              )}

              <div className="marks-section">
                <div className="marks-section-header">
                  <div>
                    <h3>Student Marks</h3>
                    <p>
                      {selectedMarks.length} student
                      {selectedMarks.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  {selectedSubmission.submitted_at && (
                    <small>
                      Submitted{" "}
                      {new Date(
                        selectedSubmission.submitted_at
                      ).toLocaleString()}
                    </small>
                  )}
                </div>

                {loadingMarks ? (
                  <div className="marks-loading">
                    Loading student marks...
                  </div>
                ) : selectedMarks.length === 0 ? (
                  <div className="marks-empty">
                    No marks have been entered for this
                    submission.
                  </div>
                ) : (
                  <div className="marks-table-wrapper">
                    <table className="marks-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Admission No.</th>
                          <th>Student</th>
                          <th>Score</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedMarks.map(
                          (mark, index) => (
                            <tr key={mark.id}>
                              <td>{index + 1}</td>

                              <td>
                                <strong>
                                  {mark.students
                                    ?.admission_number ||
                                    "—"}
                                </strong>
                              </td>

                              <td>
                                {getStudentName(
                                  mark.students
                                )}
                              </td>

                              <td>
                                <span
                                  className={`mark-score ${getScoreClass(
                                    mark.score
                                  )}`}
                                >
                                  {Number(
                                    mark.score
                                  ).toFixed(2)}
                                </span>
                              </td>

                              <td>
                                {mark.remarks || "—"}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="review-actions">
                <label htmlFor="review-comment">
                  Review Comment
                </label>

                <textarea
                  id="review-comment"
                  value={reviewComment}
                  onChange={(e) =>
                    setReviewComment(e.target.value)
                  }
                  placeholder="Add a comment for the staff member..."
                  rows={3}
                  disabled={
                    processing ||
                    selectedSubmission.status ===
                      "approved"
                  }
                />

                <div className="review-buttons">
                  {selectedSubmission.status ===
                    "submitted" && (
                    <>
                      <button
                        type="button"
                        className="return-button"
                        onClick={handleReturn}
                        disabled={processing}
                      >
                        {processing
                          ? "Processing..."
                          : "↩️ Return for Correction"}
                      </button>

                      <button
                        type="button"
                        className="approve-button"
                        onClick={handleApprove}
                        disabled={processing}
                      >
                        {processing
                          ? "Processing..."
                          : "✓ Approve Results"}
                      </button>
                    </>
                  )}

                  {selectedSubmission.status ===
                    "returned" && (
                    <div className="review-info">
                      Waiting for the staff member to correct
                      and resubmit these results.
                    </div>
                  )}

                  {selectedSubmission.status ===
                    "draft" && (
                    <div className="review-info">
                      These marks have not yet been submitted
                      by the staff member.
                    </div>
                  )}

                  {selectedSubmission.status ===
                    "approved" && (
                    <div className="review-approved">
                      ✓ These results have been approved and are
                      now official.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default Results;