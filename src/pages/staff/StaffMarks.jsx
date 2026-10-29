import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../services/supabase";
import "./StaffMarks.css";

function StaffMarks() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [staff, setStaff] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(
    searchParams.get("assignment") || ""
  );

  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [submission, setSubmission] = useState(null);

  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedAssignment = useMemo(
    () =>
      assignments.find(
        (assignment) => assignment.id === selectedAssignmentId
      ) || null,
    [assignments, selectedAssignmentId]
  );

  const isLocked =
    submission?.status === "submitted" ||
    submission?.status === "approved";

  useEffect(() => {
    loadStaffAndAssignments();
  }, []);

  useEffect(() => {
    if (selectedAssignmentId) {
      loadAssignmentData(selectedAssignmentId);
    } else {
      setStudents([]);
      setMarks({});
      setSubmission(null);
    }
  }, [selectedAssignmentId]);

  const loadStaffAndAssignments = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select(`
          id,
          institution_id,
          full_name,
          staff_number,
          email
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (staffError) throw staffError;

      if (!staffData) {
        throw new Error("Your staff account could not be found.");
      }

      setStaff(staffData);

      const { data: assignmentData, error: assignmentError } =
        await supabase
          .from("staff_teaching_assignments")
          .select(`
            id,
            staff_id,
            department_id,
            programme_id,
            academic_unit_id,
            class_id,
            academic_year,
            term,
            is_active,

            departments (
              id,
              name,
              code
            ),

            programmes (
              id,
              name,
              code
            ),

            academic_units (
              id,
              name,
              code,
              unit_type,
              academic_level
            ),

            classes (
              id,
              name,
              academic_year,
              term
            )
          `)
          .eq("staff_id", staffData.id)
          .eq("institution_id", staffData.institution_id)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

      if (assignmentError) throw assignmentError;

      setAssignments(assignmentData || []);

      if (
        selectedAssignmentId &&
        !assignmentData?.some(
          (assignment) => assignment.id === selectedAssignmentId
        )
      ) {
        setSelectedAssignmentId("");
      }
    } catch (err) {
      console.error("Staff marks loading error:", err);
      setError(err.message || "Failed to load teaching assignments.");
    } finally {
      setLoading(false);
    }
  };

  const loadAssignmentData = async (assignmentId) => {
    try {
      setStudentsLoading(true);
      setError("");
      setMessage("");

      const assignment = assignments.find(
        (item) => item.id === assignmentId
      );

      if (!assignment || !staff) return;

      /*
       * STUDENT FILTERING
       *
       * First priority:
       * class_id
       *
       * For higher education:
       * programme_id + department_id
       *
       * Everything is also restricted to the staff institution.
       */

      let studentQuery = supabase
        .from("students")
        .select(`
          id,
          admission_number,
          first_name,
          middle_name,
          last_name,
          gender,
          class_id,
          programme_id,
          department_id,
          status
        `)
        .eq("institution_id", staff.institution_id)
        .eq("status", "active")
        .order("admission_number", { ascending: true });

      if (assignment.class_id) {
        studentQuery = studentQuery.eq("class_id", assignment.class_id);
      } else if (assignment.programme_id) {
        studentQuery = studentQuery.eq(
          "programme_id",
          assignment.programme_id
        );

        if (assignment.department_id) {
          studentQuery = studentQuery.eq(
            "department_id",
            assignment.department_id
          );
        }
      } else if (assignment.department_id) {
        studentQuery = studentQuery.eq(
          "department_id",
          assignment.department_id
        );
      }

      const { data: studentData, error: studentError } =
        await studentQuery;

      if (studentError) throw studentError;

      setStudents(studentData || []);

      const { data: submissionData, error: submissionError } =
        await supabase
          .from("mark_submissions")
          .select(`
            id,
            assignment_id,
            submitted_by,
            status,
            submitted_at,
            reviewed_at,
            reviewed_by,
            review_comment,
            created_at,
            updated_at
          `)
          .eq("assignment_id", assignmentId)
          .maybeSingle();

      if (submissionError) throw submissionError;

      setSubmission(submissionData || null);

      const { data: marksData, error: marksError } = await supabase
        .from("marks")
        .select(`
          id,
          student_id,
          score,
          remarks,
          assignment_id,
          academic_unit_id,
          class_id
        `)
        .eq("assignment_id", assignmentId);

      if (marksError) throw marksError;

      const marksMap = {};

      (marksData || []).forEach((mark) => {
        marksMap[mark.student_id] = {
          score: mark.score,
          remarks: mark.remarks || "",
          id: mark.id,
        };
      });

      setMarks(marksMap);
    } catch (err) {
      console.error("Assignment data error:", err);
      setError(err.message || "Failed to load students and marks.");
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleScoreChange = (studentId, value) => {
    if (isLocked) return;

    if (value === "") {
      setMarks((previous) => ({
        ...previous,
        [studentId]: {
          ...(previous[studentId] || {}),
          score: "",
        },
      }));

      return;
    }

    let numericValue = Number(value);

    if (Number.isNaN(numericValue)) return;

    if (numericValue < 0) numericValue = 0;
    if (numericValue > 100) numericValue = 100;

    setMarks((previous) => ({
      ...previous,
      [studentId]: {
        ...(previous[studentId] || {}),
        score: numericValue,
      },
    }));
  };

  const handleRemarksChange = (studentId, value) => {
    if (isLocked) return;

    setMarks((previous) => ({
      ...previous,
      [studentId]: {
        ...(previous[studentId] || {}),
        remarks: value,
      },
    }));
  };

  const saveMarks = async (submit = false) => {
    if (!staff || !selectedAssignment) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (isLocked) {
        throw new Error(
          "These marks have already been submitted and can no longer be edited."
        );
      }

      if (!students.length) {
        throw new Error("There are no active students in this assignment.");
      }

      const missingStudents = students.filter((student) => {
        const value = marks[student.id]?.score;

        return (
          value === undefined ||
          value === null ||
          value === "" ||
          Number.isNaN(Number(value))
        );
      });

      if (submit && missingStudents.length > 0) {
        throw new Error(
          `${missingStudents.length} student(s) do not have marks. Enter all marks before submitting.`
        );
      }

      /*
       * Make sure a draft submission exists.
       */
      const submissionPayload = {
        institution_id: staff.institution_id,
        assignment_id: selectedAssignment.id,
        submitted_by: (await supabase.auth.getUser()).data.user?.id,
        status: submit ? "submitted" : "draft",
        submitted_at: submit ? new Date().toISOString() : null,
      };

      const { data: submissionData, error: submissionError } =
        await supabase
          .from("mark_submissions")
          .upsert(submissionPayload, {
            onConflict: "assignment_id",
          })
          .select()
          .single();

      if (submissionError) throw submissionError;

      /*
       * Save marks.
       */
      const markRows = students
        .filter((student) => {
          const value = marks[student.id]?.score;

          return (
            value !== undefined &&
            value !== null &&
            value !== "" &&
            !Number.isNaN(Number(value))
          );
        })
        .map((student) => ({
          institution_id: staff.institution_id,
          assignment_id: selectedAssignment.id,
          student_id: student.id,
          academic_unit_id: selectedAssignment.academic_unit_id,
          class_id: selectedAssignment.class_id || null,
          score: Number(marks[student.id].score),
          remarks: marks[student.id].remarks || null,
        }));

      if (markRows.length > 0) {
        const { error: marksError } = await supabase
          .from("marks")
          .upsert(markRows, {
            onConflict: "student_id,assignment_id",
          });

        if (marksError) throw marksError;
      }

      setSubmission(submissionData);

      if (submit) {
        setMessage(
          "Marks submitted successfully. The institution administrator can now review them."
        );
      } else {
        setMessage("Marks saved as draft.");
      }
    } catch (err) {
      console.error("Saving marks error:", err);
      setError(err.message || "Failed to save marks.");
    } finally {
      setSaving(false);
    }
  };

  const getStudentName = (student) => {
    return [
      student.first_name,
      student.middle_name,
      student.last_name,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const completedCount = students.filter((student) => {
    const value = marks[student.id]?.score;

    return (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !Number.isNaN(Number(value))
    );
  }).length;

  if (loading) {
    return (
      <div className="staff-marks-loading">
        <h2>Loading marks workspace...</h2>
      </div>
    );
  }

  return (
    <div className="staff-marks-page">
      <header className="staff-marks-header">
        <div>
          <button
            className="back-button"
            onClick={() => navigate("/staff")}
          >
            ← Staff Portal
          </button>

          <h1>Marks Entry</h1>

          <p>
            Enter and submit marks for the teaching assignments allocated to
            you.
          </p>
        </div>

        <div className="staff-marks-user">
          <strong>{staff?.full_name}</strong>
          <span>{staff?.staff_number || "Staff"}</span>
        </div>
      </header>

      {error && (
        <div className="staff-marks-alert staff-marks-error">
          {error}
        </div>
      )}

      {message && (
        <div className="staff-marks-alert staff-marks-success">
          {message}
        </div>
      )}

      {assignments.length === 0 ? (
        <section className="marks-empty">
          <h2>No Teaching Assignments</h2>
          <p>
            You currently have no active teaching assignments. Contact the
            institution administrator.
          </p>
        </section>
      ) : (
        <>
          <section className="assignment-selector">
            <label>Select Teaching Assignment</label>

            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
            >
              <option value="">Choose a unit / subject</option>

              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.academic_units?.code
                    ? `${assignment.academic_units.code} — `
                    : ""}
                  {assignment.academic_units?.name || "Academic Unit"}
                  {assignment.classes?.name
                    ? ` — ${assignment.classes.name}`
                    : ""}
                </option>
              ))}
            </select>
          </section>

          {selectedAssignment && (
            <>
              <section className="assignment-summary">
                <div>
                  <span>Academic Unit</span>
                  <strong>
                    {selectedAssignment.academic_units?.name || "—"}
                  </strong>
                  <small>
                    {selectedAssignment.academic_units?.code || ""}
                  </small>
                </div>

                <div>
                  <span>Class</span>
                  <strong>
                    {selectedAssignment.classes?.name || "Programme students"}
                  </strong>
                </div>

                <div>
                  <span>Academic Year</span>
                  <strong>{selectedAssignment.academic_year || "—"}</strong>
                </div>

                <div>
                  <span>Term</span>
                  <strong>{selectedAssignment.term || "—"}</strong>
                </div>

                <div>
                  <span>Progress</span>
                  <strong>
                    {completedCount}/{students.length}
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong className={`submission-status ${submission?.status || "draft"}`}>
                    {submission?.status || "draft"}
                  </strong>
                </div>
              </section>

              {submission?.status === "returned" && (
                <div className="returned-notice">
                  <strong>Marks Returned by Administrator</strong>

                  <p>
                    {submission.review_comment ||
                      "The administrator has returned these marks for correction."}
                  </p>
                </div>
              )}

              {submission?.status === "submitted" && (
                <div className="submitted-notice">
                  <strong>Marks Submitted</strong>

                  <p>
                    These marks are now locked while waiting for administrator
                    review.
                  </p>
                </div>
              )}

              {submission?.status === "approved" && (
                <div className="approved-notice">
                  <strong>Marks Approved</strong>

                  <p>
                    These marks have been finalized by the institution
                    administrator.
                  </p>
                </div>
              )}

              <section className="marks-table-section">
                <div className="marks-table-header">
                  <div>
                    <h2>Student Marks</h2>

                    <p>
                      Enter a score between 0 and 100 for every student.
                    </p>
                  </div>

                  <div className="marks-actions">
                    <button
                      type="button"
                      onClick={() => saveMarks(false)}
                      disabled={saving || isLocked}
                      className="save-draft-button"
                    >
                      {saving ? "Saving..." : "Save Draft"}
                    </button>

                    <button
                      type="button"
                      onClick={() => saveMarks(true)}
                      disabled={saving || isLocked}
                      className="submit-marks-button"
                    >
                      {saving ? "Processing..." : "Review & Submit"}
                    </button>
                  </div>
                </div>

                {studentsLoading ? (
                  <div className="students-loading">
                    Loading students...
                  </div>
                ) : students.length === 0 ? (
                  <div className="students-empty">
                    <h3>No Students Found</h3>
                    <p>
                      No active students were found for this teaching
                      assignment.
                    </p>
                  </div>
                ) : (
                  <div className="marks-table-wrapper">
                    <table className="marks-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Admission No.</th>
                          <th>Student Name</th>
                          <th>Gender</th>
                          <th>Score / 100</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>

                      <tbody>
                        {students.map((student, index) => (
                          <tr key={student.id}>
                            <td>{index + 1}</td>

                            <td>
                              <strong>{student.admission_number}</strong>
                            </td>

                            <td>{getStudentName(student)}</td>

                            <td>{student.gender || "—"}</td>

                            <td>
                              <input
                                className="score-input"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={marks[student.id]?.score ?? ""}
                                disabled={isLocked}
                                onChange={(e) =>
                                  handleScoreChange(
                                    student.id,
                                    e.target.value
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                className="remarks-input"
                                type="text"
                                placeholder="Optional"
                                value={
                                  marks[student.id]?.remarks ?? ""
                                }
                                disabled={isLocked}
                                onChange={(e) =>
                                  handleRemarksChange(
                                    student.id,
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default StaffMarks;