import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import "./StudentResults.css";

const StudentResults = () => {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const [institution, setInstitution] = useState(null);
  const [results, setResults] = useState([]);

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [units, setUnits] = useState([]);

  const [studentFilter, setStudentFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");

  const loadResults = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You are not logged in.");

      const { data: membership, error: membershipError } = await supabase
        .from("institution_members")
        .select("institution_id, role, is_active")
        .eq("user_id", user.id)
        .eq("role", "institution_admin")
        .eq("is_active", true)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) {
        throw new Error("You are not an active institution administrator.");
      }

      const institutionId = membership.institution_id;

      const { data: institutionData, error: institutionError } =
        await supabase
          .from("institutions")
          .select("id, name, institution_type")
          .eq("id", institutionId)
          .single();

      if (institutionError) throw institutionError;

      setInstitution(institutionData);

      const { data: resultData, error: resultError } = await supabase
        .from("student_results")
        .select(`
          id,
          institution_id,
          student_id,
          mark_id,
          assignment_id,
          academic_unit_id,
          class_id,
          grading_scale_id,
          grading_scale_item_id,
          score,
          grade,
          points,
          remark,
          created_at,
          updated_at
        `)
        .eq("institution_id", institutionId)
        .order("created_at", { ascending: false });

      if (resultError) throw resultError;

      const resultRows = resultData || [];

      const studentIds = [
        ...new Set(resultRows.map((row) => row.student_id).filter(Boolean)),
      ];

      const classIds = [
        ...new Set(resultRows.map((row) => row.class_id).filter(Boolean)),
      ];

      const unitIds = [
        ...new Set(
          resultRows.map((row) => row.academic_unit_id).filter(Boolean)
        ),
      ];

      const assignmentIds = [
        ...new Set(
          resultRows.map((row) => row.assignment_id).filter(Boolean)
        ),
      ];

      let studentData = [];
      let classData = [];
      let unitData = [];
      let assignmentData = [];

      if (studentIds.length > 0) {
        const { data, error } = await supabase
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
          .in("id", studentIds);

        if (error) throw error;
        studentData = data || [];
      }

      if (classIds.length > 0) {
        const { data, error } = await supabase
          .from("classes")
          .select(`
            id,
            name,
            academic_year,
            term,
            programme_id,
            department_id
          `)
          .in("id", classIds);

        if (error) throw error;
        classData = data || [];
      }

      if (unitIds.length > 0) {
        const { data, error } = await supabase
          .from("academic_units")
          .select(`
            id,
            code,
            name,
            unit_type,
            programme_id,
            department_id,
            class_id,
            academic_level
          `)
          .in("id", unitIds);

        if (error) throw error;
        unitData = data || [];
      }

      if (assignmentIds.length > 0) {
        const { data, error } = await supabase
          .from("staff_teaching_assignments")
          .select(`
            id,
            academic_year,
            term,
            programme_id,
            department_id,
            class_id
          `)
          .in("id", assignmentIds);

        if (error) throw error;
        assignmentData = data || [];
      }

      const programmeIds = [
        ...new Set([
          ...studentData.map((student) => student.programme_id),
          ...classData.map((item) => item.programme_id),
          ...unitData.map((unit) => unit.programme_id),
          ...assignmentData.map((assignment) => assignment.programme_id),
        ].filter(Boolean)),
      ];

      let programmeData = [];

      if (programmeIds.length > 0) {
        const { data, error } = await supabase
          .from("programmes")
          .select("id, name, code, department_id")
          .in("id", programmeIds);

        if (error) throw error;
        programmeData = data || [];
      }

      const studentMap = Object.fromEntries(
        studentData.map((student) => [student.id, student])
      );

      const classMap = Object.fromEntries(
        classData.map((item) => [item.id, item])
      );

      const unitMap = Object.fromEntries(
        unitData.map((unit) => [unit.id, unit])
      );

      const assignmentMap = Object.fromEntries(
        assignmentData.map((assignment) => [assignment.id, assignment])
      );

      const programmeMap = Object.fromEntries(
        programmeData.map((programme) => [programme.id, programme])
      );

      const mergedResults = resultRows.map((result) => {
        const student = studentMap[result.student_id] || {};
        const classInfo = classMap[result.class_id] || {};
        const unit = unitMap[result.academic_unit_id] || {};
        const assignment = assignmentMap[result.assignment_id] || {};

        const programmeId =
          student.programme_id ||
          classInfo.programme_id ||
          unit.programme_id ||
          assignment.programme_id;

        return {
          ...result,
          student,
          classInfo,
          unit,
          assignment,
          programme: programmeMap[programmeId] || null,
        };
      });

      setStudents(studentData);
      setClasses(classData);
      setProgrammes(programmeData);
      setUnits(unitData);
      setResults(mergedResults);
    } catch (err) {
      console.error("Student results loading error:", err);
      setError(err.message || "Failed to load student results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      const student = result.student || {};
      const classInfo = result.classInfo || {};
      const programme = result.programme || {};
      const assignment = result.assignment || {};

      const matchesStudent =
        !studentFilter || student.id === studentFilter;

      const matchesClass =
        !classFilter || classInfo.id === classFilter;

      const matchesProgramme =
        !programmeFilter || programme.id === programmeFilter;

      const matchesYear =
        !yearFilter ||
        String(assignment.academic_year || classInfo.academic_year) ===
          String(yearFilter);

      const matchesTerm =
        !termFilter ||
        String(assignment.term || classInfo.term) === String(termFilter);

      return (
        matchesStudent &&
        matchesClass &&
        matchesProgramme &&
        matchesYear &&
        matchesTerm
      );
    });
  }, [
    results,
    studentFilter,
    classFilter,
    programmeFilter,
    yearFilter,
    termFilter,
  ]);

  const summary = useMemo(() => {
    const total = filteredResults.length;

    const average =
      total > 0
        ? filteredResults.reduce(
            (sum, result) => sum + Number(result.score || 0),
            0
          ) / total
        : 0;

    const studentsCount = new Set(
      filteredResults.map((result) => result.student_id)
    ).size;

    const passed = filteredResults.filter(
      (result) => Number(result.score || 0) >= 50
    ).length;

    return {
      total,
      studentsCount,
      average,
      passed,
    };
  }, [filteredResults]);

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

  const formatScore = (score) => {
    const value = Number(score);

    if (Number.isNaN(value)) return "-";

    return value % 1 === 0 ? value.toString() : value.toFixed(2);
  };

  const clearFilters = () => {
    setStudentFilter("");
    setClassFilter("");
    setProgrammeFilter("");
    setYearFilter("");
    setTermFilter("");
  };

  const printResults = () => {
    if (filteredResults.length === 0) {
      alert("There are no results to print.");
      return;
    }

    const institutionName = institution?.name || "Institution";

    const rows = filteredResults
      .map((result, index) => {
        const studentName = getStudentName(result.student);
        const unit = result.unit || {};
        const classInfo = result.classInfo || {};
        const programme = result.programme || {};

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${result.student?.admission_number || "-"}</td>
            <td>${studentName}</td>
            <td>${unit.code || "-"}</td>
            <td>${unit.name || "-"}</td>
            <td>${classInfo.name || "-"}</td>
            <td>${programme.name || "-"}</td>
            <td>${formatScore(result.score)}</td>
            <td>${result.grade || "-"}</td>
            <td>${result.points ?? "-"}</td>
            <td>${result.remark || "-"}</td>
          </tr>
        `;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      alert("Please allow pop-ups to print the results.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Results - ${institutionName}</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            margin: 30px;
            color: #111827;
          }

          h1 {
            margin: 0;
            text-align: center;
            font-size: 24px;
          }

          h2 {
            text-align: center;
            margin: 6px 0 20px;
            font-size: 16px;
            font-weight: normal;
          }

          .summary {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            font-size: 13px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          th,
          td {
            border: 1px solid #d1d5db;
            padding: 7px;
            text-align: left;
          }

          th {
            background: #f3f4f6;
          }

          .footer {
            margin-top: 30px;
            font-size: 11px;
            color: #6b7280;
          }

          @media print {
            body {
              margin: 10mm;
            }
          }
        </style>
      </head>

      <body>
        <h1>${institutionName}</h1>
        <h2>Student Results</h2>

        <div class="summary">
          <span><strong>Results:</strong> ${summary.total}</span>
          <span><strong>Students:</strong> ${summary.studentsCount}</span>
          <span><strong>Average:</strong> ${summary.average.toFixed(2)}%</span>
          <span><strong>Passed:</strong> ${summary.passed}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Admission No.</th>
              <th>Student</th>
              <th>Code</th>
              <th>Unit / Subject</th>
              <th>Class</th>
              <th>Programme</th>
              <th>Score</th>
              <th>Grade</th>
              <th>Points</th>
              <th>Remark</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="footer">
          Generated from the Education Management Platform.
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  const downloadCSV = () => {
    if (filteredResults.length === 0) {
      alert("There are no results to download.");
      return;
    }

    setExporting(true);

    try {
      const headers = [
        "Admission Number",
        "Student Name",
        "Academic Unit Code",
        "Academic Unit",
        "Class",
        "Programme",
        "Academic Year",
        "Term",
        "Score",
        "Grade",
        "Points",
        "Remark",
      ];

      const csvRows = filteredResults.map((result) => {
        const student = result.student || {};
        const unit = result.unit || {};
        const classInfo = result.classInfo || {};
        const programme = result.programme || {};
        const assignment = result.assignment || {};

        return [
          student.admission_number || "",
          getStudentName(student),
          unit.code || "",
          unit.name || "",
          classInfo.name || "",
          programme.name || "",
          assignment.academic_year || classInfo.academic_year || "",
          assignment.term || classInfo.term || "",
          formatScore(result.score),
          result.grade || "",
          result.points ?? "",
          result.remark || "",
        ];
      });

      const escapeCSV = (value) => {
        const text = String(value ?? "");
        return `"${text.replace(/"/g, '""')}"`;
      };

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...csvRows.map((row) => row.map(escapeCSV).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `student-results-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="student-results-page">
        <div className="student-results-loading">
          Loading student results...
        </div>
      </div>
    );
  }

  return (
    <div className="student-results-page">
      <div className="student-results-header">
        <div>
          <h1>Student Results</h1>
          <p>
            View processed academic results and generate official result
            records.
          </p>
        </div>

        <div className="student-results-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={loadResults}
          >
            ↻ Refresh
          </button>

          <button
            type="button"
            className="secondary-action"
            onClick={printResults}
            disabled={filteredResults.length === 0}
          >
            🖨️ Print Results
          </button>

          <button
            type="button"
            className="primary-action"
            onClick={downloadCSV}
            disabled={filteredResults.length === 0 || exporting}
          >
            {exporting ? "Preparing..." : "⬇️ Download CSV"}
          </button>
        </div>
      </div>

      {error && (
        <div className="student-results-error">
          {error}
        </div>
      )}

      <div className="student-results-summary">
        <div className="result-summary-card">
          <span>Total Results</span>
          <strong>{summary.total}</strong>
        </div>

        <div className="result-summary-card">
          <span>Students</span>
          <strong>{summary.studentsCount}</strong>
        </div>

        <div className="result-summary-card">
          <span>Average Score</span>
          <strong>{summary.average.toFixed(2)}%</strong>
        </div>

        <div className="result-summary-card">
          <span>Passed</span>
          <strong>{summary.passed}</strong>
        </div>
      </div>

      <div className="student-results-filters">
        <div className="filter-header">
          <div>
            <h2>Filter Results</h2>
            <p>Choose the records you want to view or export.</p>
          </div>

          <button
            type="button"
            className="clear-filters-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label>Student</label>
            <select
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
            >
              <option value="">All Students</option>

              {students
                .slice()
                .sort((a, b) =>
                  getStudentName(a).localeCompare(getStudentName(b))
                )
                .map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.admission_number
                      ? `${student.admission_number} - `
                      : ""}
                    {getStudentName(student)}
                  </option>
                ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Class</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">All Classes</option>

              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.academic_year
                    ? ` - ${item.academic_year}`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Programme</label>
            <select
              value={programmeFilter}
              onChange={(e) => setProgrammeFilter(e.target.value)}
            >
              <option value="">All Programmes</option>

              {programmes.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.code
                    ? `${programme.code} - `
                    : ""}
                  {programme.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Academic Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="">All Years</option>

              {[
                ...new Set(
                  results
                    .map(
                      (result) =>
                        result.assignment?.academic_year ||
                        result.classInfo?.academic_year
                    )
                    .filter(Boolean)
                ),
              ]
                .sort()
                .map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Term</label>
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
            >
              <option value="">All Terms</option>

              {[
                ...new Set(
                  results
                    .map(
                      (result) =>
                        result.assignment?.term ||
                        result.classInfo?.term
                    )
                    .filter(Boolean)
                ),
              ]
                .sort()
                .map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      <div className="student-results-table-card">
        <div className="results-table-header">
          <div>
            <h2>Processed Results</h2>
            <p>
              Showing {filteredResults.length} result
              {filteredResults.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>

        {filteredResults.length === 0 ? (
          <div className="student-results-empty">
            <div className="empty-icon">📊</div>

            <h3>No processed results found</h3>

            <p>
              Process approved marks first, or change the filters above.
            </p>
          </div>
        ) : (
          <div className="results-table-wrapper">
            <table className="student-results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Admission No.</th>
                  <th>Student</th>
                  <th>Unit Code</th>
                  <th>Academic Unit</th>
                  <th>Class</th>
                  <th>Programme</th>
                  <th>Year</th>
                  <th>Term</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Points</th>
                  <th>Remark</th>
                </tr>
              </thead>

              <tbody>
                {filteredResults.map((result, index) => (
                  <tr key={result.id}>
                    <td>{index + 1}</td>

                    <td>
                      {result.student?.admission_number || "-"}
                    </td>

                    <td className="student-name-cell">
                      {getStudentName(result.student)}
                    </td>

                    <td>
                      {result.unit?.code || "-"}
                    </td>

                    <td>
                      {result.unit?.name || "-"}
                    </td>

                    <td>
                      {result.classInfo?.name || "-"}
                    </td>

                    <td>
                      {result.programme?.name || "-"}
                    </td>

                    <td>
                      {result.assignment?.academic_year ||
                        result.classInfo?.academic_year ||
                        "-"}
                    </td>

                    <td>
                      {result.assignment?.term ||
                        result.classInfo?.term ||
                        "-"}
                    </td>

                    <td className="score-cell">
                      {formatScore(result.score)}
                    </td>

                    <td>
                      <span className="grade-badge">
                        {result.grade || "-"}
                      </span>
                    </td>

                    <td>
                      {result.points ?? "-"}
                    </td>

                    <td>
                      {result.remark || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentResults;