import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";

function Students() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [academicUnits, setAcademicUnits] = useState([]);
  const [institution, setInstitution] = useState(null);

  const [institutionId, setInstitutionId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const emptyForm = {
    admission_number: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    gender: "",
    date_of_birth: "",
    email: "",
    phone: "",
    address: "",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    class_id: "",
    department_id: "",
    programme_id: "",
    admission_date: "",
    status: "active",
  };

  const [form, setForm] = useState(emptyForm);

  // =========================================
  // INSTITUTION TYPE HELPERS
  // =========================================

  const institutionType = institution?.institution_type || "";

  const isSchool = [
    "primary",
    "secondary",
    "junior_secondary",
    "junior",
    "school",
  ].includes(institutionType?.toLowerCase());

  const isUniversity = [
    "university",
    "college",
    "tvet",
  ].includes(institutionType?.toLowerCase());

  const placementTitle = isSchool
    ? "Class / Grade Placement"
    : "Academic Placement";

  const classLabel = isSchool
    ? "Class / Grade"
    : "Class";

  // =========================================
  // FILTER PROGRAMMES BY DEPARTMENT
  // =========================================

  const availableProgrammes = useMemo(() => {
    if (!form.department_id) return [];

    return programmes.filter(
      (programme) =>
        programme.department_id === form.department_id
    );
  }, [programmes, form.department_id]);

  // =========================================
  // UNITS FOR SELECTED PROGRAMME
  // =========================================

  const selectedProgrammeUnits = useMemo(() => {
    if (!form.programme_id) return [];

    return academicUnits.filter(
      (unit) =>
        unit.programme_id === form.programme_id &&
        unit.is_active !== false
    );
  }, [academicUnits, form.programme_id]);

  // =========================================
  // LOAD DATA
  // =========================================

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setMessage("Please log in again.");
        setMessageType("error");
        setLoading(false);
        return;
      }

      // Get administrator's institution
      const { data: membership, error: membershipError } =
        await supabase
          .from("institution_members")
          .select("institution_id")
          .eq("user_id", user.id)
          .eq("role", "institution_admin")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

      if (membershipError) throw membershipError;

      if (!membership) {
        setMessage(
          "No institution was found for this account."
        );
        setMessageType("error");
        setLoading(false);
        return;
      }

      setInstitutionId(membership.institution_id);

      // =========================================
      // LOAD INSTITUTION
      // =========================================

      const {
        data: institutionData,
        error: institutionError,
      } = await supabase
        .from("institutions")
        .select(`
          id,
          name,
          institution_type
        `)
        .eq("id", membership.institution_id)
        .maybeSingle();

      if (institutionError) throw institutionError;

      setInstitution(institutionData);

      // =========================================
      // LOAD STUDENTS
      // =========================================

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(`
          *,
          classes (
            id,
            name,
            academic_year,
            term
          ),
          departments (
            id,
            name,
            code
          ),
          programmes (
            id,
            name,
            code,
            department_id
          )
        `)
        .eq(
          "institution_id",
          membership.institution_id
        )
        .order("created_at", {
          ascending: false,
        });

      if (studentError) throw studentError;

      setStudents(studentData || []);

      // =========================================
      // LOAD CLASSES
      // =========================================

      const {
        data: classData,
        error: classError,
      } = await supabase
        .from("classes")
        .select(`
          id,
          name,
          academic_year,
          term
        `)
        .eq(
          "institution_id",
          membership.institution_id
        )
        .order("name");

      if (classError) throw classError;

      setClasses(classData || []);

      // =========================================
      // LOAD DEPARTMENTS
      // =========================================

      const {
        data: departmentData,
        error: departmentError,
      } = await supabase
        .from("departments")
        .select(`
          id,
          name,
          code
        `)
        .eq(
          "institution_id",
          membership.institution_id
        )
        .order("name");

      if (departmentError) throw departmentError;

      setDepartments(departmentData || []);

      // =========================================
      // LOAD PROGRAMMES
      // =========================================

      const {
        data: programmeData,
        error: programmeError,
      } = await supabase
        .from("programmes")
        .select(`
          id,
          name,
          code,
          department_id
        `)
        .eq(
          "institution_id",
          membership.institution_id
        )
        .order("name");

      if (programmeError) throw programmeError;

      setProgrammes(programmeData || []);

      // =========================================
      // LOAD ACADEMIC UNITS
      // =========================================

      const {
        data: unitData,
        error: unitError,
      } = await supabase
        .from("academic_units")
        .select(`
          id,
          institution_id,
          department_id,
          programme_id,
          code,
          name,
          unit_type,
          academic_level,
          description,
          is_active
        `)
        .eq(
          "institution_id",
          membership.institution_id
        )
        .order("code");

      if (unitError) throw unitError;

      setAcademicUnits(unitData || []);
    } catch (error) {
      console.error(error);

      setMessage(
        error.message || "Failed to load students."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // FORM HANDLING
  // =========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    // When department changes,
    // clear the programme because the old
    // programme may belong to another department.
    if (name === "department_id") {
      setForm((previous) => ({
        ...previous,
        department_id: value,
        programme_id: "",
      }));
    }

    // When programme changes, units will
    // automatically update through useMemo.
  };

  const openAddForm = () => {
    setEditingStudent(null);

    setForm({
      ...emptyForm,
      admission_date: new Date()
        .toISOString()
        .split("T")[0],
    });

    setMessage("");
    setMessageType("");
    setShowForm(true);
  };

  const openEditForm = (student) => {
    setEditingStudent(student);

    setForm({
      admission_number:
        student.admission_number || "",

      first_name:
        student.first_name || "",

      middle_name:
        student.middle_name || "",

      last_name:
        student.last_name || "",

      gender:
        student.gender || "",

      date_of_birth:
        student.date_of_birth || "",

      email:
        student.email || "",

      phone:
        student.phone || "",

      address:
        student.address || "",

      guardian_name:
        student.guardian_name || "",

      guardian_phone:
        student.guardian_phone || "",

      guardian_email:
        student.guardian_email || "",

      class_id:
        student.class_id || "",

      department_id:
        student.department_id || "",

      programme_id:
        student.programme_id || "",

      admission_date:
        student.admission_date || "",

      status:
        student.status || "active",
    });

    setMessage("");
    setMessageType("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingStudent(null);
    setForm(emptyForm);
  };

  // =========================================
  // GET PROGRAMME UNITS
  // =========================================

  const getProgrammeUnits = (programmeId) => {
    return academicUnits.filter(
      (unit) =>
        unit.programme_id === programmeId &&
        unit.is_active !== false
    );
  };

  // =========================================
  // ASSIGN UNITS TO STUDENT
  // =========================================

  const assignUnitsToStudent = async (
    studentId,
    programmeId
  ) => {
    if (!programmeId) {
      return {
        assigned: 0,
        skipped: true,
      };
    }

    const units = getProgrammeUnits(programmeId);

    if (units.length === 0) {
      return {
        assigned: 0,
        skipped: false,
        noUnits: true,
      };
    }

    const registrations = units.map((unit) => ({
      student_id: studentId,
      academic_unit_id: unit.id,
      status: "active",
    }));

    const { error } = await supabase
      .from("student_academic_units")
      .upsert(registrations, {
        onConflict:
          "student_id,academic_unit_id",
        ignoreDuplicates: true,
      });

    if (error) throw error;

    return {
      assigned: units.length,
      skipped: false,
      noUnits: false,
    };
  };

  // =========================================
  // SAVE STUDENT
  // =========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!institutionId) {
      setMessage(
        "Institution information is missing."
      );
      setMessageType("error");
      return;
    }

    if (!form.admission_number.trim()) {
      setMessage(
        "Admission number is required."
      );
      setMessageType("error");
      return;
    }

    if (
      !form.first_name.trim() ||
      !form.last_name.trim()
    ) {
      setMessage(
        "Student first name and last name are required."
      );
      setMessageType("error");
      return;
    }

    // Higher institutions require department
    // and programme.
    if (isUniversity) {
      if (!form.department_id) {
        setMessage(
          "Please select the student's department."
        );
        setMessageType("error");
        return;
      }

      if (!form.programme_id) {
        setMessage(
          "Please select the student's programme."
        );
        setMessageType("error");
        return;
      }
    }

    setSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const studentData = {
        institution_id: institutionId,

        admission_number:
          form.admission_number.trim(),

        first_name:
          form.first_name.trim(),

        middle_name:
          form.middle_name.trim() || null,

        last_name:
          form.last_name.trim(),

        gender:
          form.gender || null,

        date_of_birth:
          form.date_of_birth || null,

        email:
          form.email.trim() || null,

        phone:
          form.phone.trim() || null,

        address:
          form.address.trim() || null,

        guardian_name:
          form.guardian_name.trim() || null,

        guardian_phone:
          form.guardian_phone.trim() || null,

        guardian_email:
          form.guardian_email.trim() || null,

        class_id:
          form.class_id || null,

        department_id:
          form.department_id || null,

        programme_id:
          form.programme_id || null,

        admission_date:
          form.admission_date ||
          new Date()
            .toISOString()
            .split("T")[0],

        status:
          form.status,
      };

      // =========================================
      // UPDATE EXISTING STUDENT
      // =========================================

      if (editingStudent) {
        const previousProgrammeId =
          editingStudent.programme_id || null;

        const newProgrammeId =
          form.programme_id || null;

        const { error } = await supabase
          .from("students")
          .update(studentData)
          .eq("id", editingStudent.id)
          .eq(
            "institution_id",
            institutionId
          );

        if (error) throw error;

        // If the student's programme changed,
        // update their registered units.
        if (
          previousProgrammeId !==
          newProgrammeId
        ) {
          // Remove previous programme units.
          const { error: deleteUnitsError } =
            await supabase
              .from("student_academic_units")
              .delete()
              .eq(
                "student_id",
                editingStudent.id
              );

          if (deleteUnitsError) {
            throw deleteUnitsError;
          }

          // Assign units from new programme.
          if (newProgrammeId) {
            await assignUnitsToStudent(
              editingStudent.id,
              newProgrammeId
            );
          }
        }

        const updatedUnits =
          newProgrammeId
            ? getProgrammeUnits(
                newProgrammeId
              ).length
            : 0;

        setMessage(
          updatedUnits > 0
            ? `Student updated successfully. ${updatedUnits} unit${updatedUnits === 1 ? "" : "s"} assigned.`
            : "Student updated successfully."
        );

        setMessageType("success");
      }

      // =========================================
      // REGISTER NEW STUDENT
      // =========================================

      else {
        const {
          data: newStudent,
          error,
        } = await supabase
          .from("students")
          .insert(studentData)
          .select("id")
          .single();

        if (error) throw error;

        let assignedUnits = 0;
        let noUnits = false;

        // Automatically assign programme units.
        if (
          isUniversity &&
          form.programme_id
        ) {
          const result =
            await assignUnitsToStudent(
              newStudent.id,
              form.programme_id
            );

          assignedUnits =
            result.assigned || 0;

          noUnits =
            result.noUnits || false;
        }

        if (assignedUnits > 0) {
          setMessage(
            `Student registered successfully. ${assignedUnits} unit${assignedUnits === 1 ? "" : "s"} automatically assigned.`
          );
        } else if (noUnits) {
          setMessage(
            "Student registered successfully, but no units have been assigned to this programme yet. Add the programme units under Academic Units."
          );
        } else {
          setMessage(
            "Student registered successfully."
          );
        }

        setMessageType("success");
      }

      setShowForm(false);
      setEditingStudent(null);
      setForm(emptyForm);

      await loadStudents();
    } catch (error) {
      console.error(error);

      if (error.code === "23505") {
        setMessage(
          "A student with this admission number already exists."
        );
      } else {
        setMessage(
          error.message ||
            "Failed to save student."
        );
      }

      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  // =========================================
  // DELETE STUDENT
  // =========================================

  const handleDelete = async (student) => {
    const confirmed = window.confirm(
      `Delete ${student.first_name} ${student.last_name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setMessage("");
    setMessageType("");

    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", student.id)
        .eq(
          "institution_id",
          institutionId
        );

      if (error) throw error;

      setMessage(
        "Student deleted successfully."
      );
      setMessageType("success");

      await loadStudents();
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Failed to delete student."
      );
      setMessageType("error");
    }
  };

  // =========================================
  // FILTERING
  // =========================================

  const filteredStudents = useMemo(() => {
    const searchText =
      search.toLowerCase().trim();

    return students.filter((student) => {
      const fullName =
        `${student.first_name || ""} ${
          student.middle_name || ""
        } ${student.last_name || ""}`.toLowerCase();

      const matchesSearch =
        !searchText ||
        fullName.includes(searchText) ||
        (student.admission_number || "")
          .toLowerCase()
          .includes(searchText) ||
        (student.email || "")
          .toLowerCase()
          .includes(searchText) ||
        (student.phone || "")
          .toLowerCase()
          .includes(searchText) ||
        (student.classes?.name || "")
          .toLowerCase()
          .includes(searchText) ||
        (student.departments?.name || "")
          .toLowerCase()
          .includes(searchText) ||
        (student.programmes?.name || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        student.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    students,
    search,
    statusFilter,
  ]);

  // =========================================
  // STATISTICS
  // =========================================

  const totalStudents =
    students.length;

  const activeStudents =
    students.filter(
      (student) =>
        student.status === "active"
    ).length;

  const inactiveStudents =
    students.filter(
      (student) =>
        student.status === "inactive"
    ).length;

  const graduatedStudents =
    students.filter(
      (student) =>
        student.status === "graduated"
    ).length;

  // =========================================
  // STUDENT INITIALS
  // =========================================

  const getInitials = (student) => {
    const first =
      student.first_name?.charAt(0) || "";

    const last =
      student.last_name?.charAt(0) || "";

    return `${first}${last}`.toUpperCase();
  };

  // =========================================
  // STATUS DISPLAY
  // =========================================

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  // =========================================
  // LOADING
  // =========================================

  if (loading) {
    return (
      <div className="module-page loading-page">
        <div className="dashboard-loading">
          <div
            style={{
              fontSize: "42px",
              marginBottom: "10px",
            }}
          >
            👨‍🎓
          </div>

          <h2>Loading Students</h2>

          <p>
            Please wait while we load your
            student records...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">

      {/* =========================================
          HEADER
      ========================================= */}

      <div className="module-header">

        <div>
          <h1>Students</h1>

          <p>
            Register students and automatically
            assign their academic units based on
            their department and programme.
          </p>

          {institution?.name && (
            <small
              style={{
                display: "inline-block",
                marginTop: "6px",
                opacity: 0.7,
              }}
            >
              {institution.name}
            </small>
          )}
        </div>

        <button
          className="primary-button"
          onClick={openAddForm}
        >
          + Add Student
        </button>

      </div>

      {/* =========================================
          MESSAGE
      ========================================= */}

      {message && (
        <div
          className="module-message"
          style={{
            borderLeft:
              messageType === "error"
                ? "4px solid #dc2626"
                : "4px solid #16a34a",
          }}
        >
          {message}
        </div>
      )}

      {/* =========================================
          STATISTICS
      ========================================= */}

      <div className="module-stats">

        <div className="module-stat-card">
          <span>👨‍🎓</span>

          <div>
            <p>Total Students</p>
            <strong>
              {totalStudents}
            </strong>
          </div>
        </div>

        <div className="module-stat-card">
          <span>🟢</span>

          <div>
            <p>Active</p>
            <strong>
              {activeStudents}
            </strong>
          </div>
        </div>

        <div className="module-stat-card">
          <span>⚪</span>

          <div>
            <p>Inactive</p>
            <strong>
              {inactiveStudents}
            </strong>
          </div>
        </div>

        <div className="module-stat-card">
          <span>🎓</span>

          <div>
            <p>Graduated</p>
            <strong>
              {graduatedStudents}
            </strong>
          </div>
        </div>

      </div>

      {/* =========================================
          SEARCH / FILTER
      ========================================= */}

      <div className="module-toolbar">

        <input
          type="search"
          placeholder="Search name, admission number, department, programme..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="all">
            All Statuses
          </option>

          <option value="active">
            Active
          </option>

          <option value="inactive">
            Inactive
          </option>

          <option value="graduated">
            Graduated
          </option>

          <option value="transferred">
            Transferred
          </option>

          <option value="suspended">
            Suspended
          </option>
        </select>

      </div>

      {/* =========================================
          STUDENT TABLE
      ========================================= */}

      <div className="module-table-card">

        <div className="module-table-header">

          <div>
            <h2>Student Records</h2>

            <p>
              Showing{" "}
              {filteredStudents.length} of{" "}
              {students.length} students
            </p>
          </div>

          <button
            className="secondary-button"
            onClick={openAddForm}
          >
            + Register
          </button>

        </div>

        {filteredStudents.length === 0 ? (

          <div className="module-empty">

            <div
              style={{
                fontSize: "48px",
              }}
            >
              👨‍🎓
            </div>

            <h3>
              No students found
            </h3>

            <p>
              {students.length === 0
                ? "Register your first student to get started."
                : "Try changing your search or status filter."}
            </p>

            {students.length === 0 && (
              <button
                className="primary-button"
                onClick={openAddForm}
              >
                + Register Student
              </button>
            )}

          </div>

        ) : (

          <div className="module-table-wrapper">

            <table className="module-table">

              <thead>
                <tr>
                  <th>
                    Admission No.
                  </th>

                  <th>
                    Student
                  </th>

                  <th>
                    Department
                  </th>

                  <th>
                    Programme
                  </th>

                  <th>
                    Units
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>

                {filteredStudents.map(
                  (student) => {

                    const studentUnits =
                      student.programme_id
                        ? getProgrammeUnits(
                            student.programme_id
                          )
                        : [];

                    return (
                      <tr
                        key={student.id}
                      >

                        {/* ADMISSION */}

                        <td>
                          <strong>
                            {
                              student.admission_number
                            }
                          </strong>

                          {student.admission_date && (
                            <small
                              style={{
                                display:
                                  "block",
                                marginTop:
                                  "4px",
                                opacity:
                                  0.6,
                              }}
                            >
                              Joined{" "}
                              {
                                student.admission_date
                              }
                            </small>
                          )}
                        </td>

                        {/* STUDENT */}

                        <td>

                          <div
                            className="student-name"
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "10px",
                            }}
                          >

                            <div
                              style={{
                                width:
                                  "38px",
                                height:
                                  "38px",
                                borderRadius:
                                  "50%",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                fontWeight:
                                  "700",
                                background:
                                  "#eef4ff",
                                color:
                                  "#064789",
                                flexShrink:
                                  0,
                              }}
                            >
                              {getInitials(
                                student
                              )}
                            </div>

                            <div>

                              <strong>
                                {
                                  student.first_name
                                }{" "}
                                {
                                  student.middle_name
                                    ? `${student.middle_name} `
                                    : ""
                                }
                                {
                                  student.last_name
                                }
                              </strong>

                              {student.email ? (
                                <small
                                  style={{
                                    display:
                                      "block",
                                    opacity:
                                      0.65,
                                  }}
                                >
                                  {
                                    student.email
                                  }
                                </small>
                              ) : student.phone ? (
                                <small
                                  style={{
                                    display:
                                      "block",
                                    opacity:
                                      0.65,
                                  }}
                                >
                                  {
                                    student.phone
                                  }
                                </small>
                              ) : null}

                            </div>

                          </div>

                        </td>

                        {/* DEPARTMENT */}

                        <td>

                          {student.departments
                            ?.code
                            ? `${student.departments.code} — ${student.departments.name}`
                            : student.departments
                                ?.name ||
                              "—"}

                        </td>

                        {/* PROGRAMME */}

                        <td>

                          {student.programmes
                            ?.code
                            ? `${student.programmes.code} — ${student.programmes.name}`
                            : student.programmes
                                ?.name ||
                              "—"}

                        </td>

                        {/* UNITS */}

                        <td>

                          {studentUnits.length >
                          0 ? (

                            <details>

                              <summary
                                style={{
                                  cursor:
                                    "pointer",
                                  fontWeight:
                                    "600",
                                  color:
                                    "#064789",
                                }}
                              >
                                {
                                  studentUnits.length
                                }{" "}
                                unit
                                {studentUnits.length ===
                                1
                                  ? ""
                                  : "s"}
                              </summary>

                              <div
                                style={{
                                  marginTop:
                                    "8px",
                                  minWidth:
                                    "220px",
                                }}
                              >

                                {studentUnits.map(
                                  (unit) => (
                                    <div
                                      key={
                                        unit.id
                                      }
                                      style={{
                                        padding:
                                          "6px 0",
                                        borderBottom:
                                          "1px solid #edf1f5",
                                        fontSize:
                                          "12px",
                                      }}
                                    >
                                      <strong>
                                        {
                                          unit.code
                                        }
                                      </strong>

                                      {" — "}

                                      {
                                        unit.name
                                      }
                                    </div>
                                  )
                                )}

                              </div>

                            </details>

                          ) : (

                            <span
                              style={{
                                color:
                                  "#9ca3af",
                              }}
                            >
                              No units
                            </span>

                          )}

                        </td>

                        {/* STATUS */}

                        <td>

                          <span
                            className={`status-badge status-${student.status}`}
                          >
                            {formatStatus(
                              student.status
                            )}
                          </span>

                        </td>

                        {/* ACTIONS */}

                        <td>

                          <div
                            className="table-actions"
                          >

                            <button
                              onClick={() =>
                                openEditForm(
                                  student
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="danger-action"
                              onClick={() =>
                                handleDelete(
                                  student
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* =========================================
          ADD / EDIT STUDENT MODAL
      ========================================= */}

      {showForm && (

        <div className="modal-overlay">

          <div className="module-modal">

            {/* MODAL HEADER */}

            <div className="module-modal-header">

              <div>

                <h2>
                  {editingStudent
                    ? "Edit Student"
                    : "Register Student"}
                </h2>

                <p>
                  {editingStudent
                    ? "Update the student's information and academic placement."
                    : "Enter the student's details and academic placement."}
                </p>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeForm}
                disabled={saving}
              >
                ×
              </button>

            </div>

            {/* FORM */}

            <form
              className="student-form"
              onSubmit={handleSubmit}
            >

              {/* =================================
                  STUDENT IDENTIFICATION
              ================================= */}

              <div className="form-section">

                <h3>
                  Student Identification
                </h3>

                <div className="form-grid">

                  <div className="form-group">

                    <label>
                      Admission Number *
                    </label>

                    <input
                      name="admission_number"
                      value={
                        form.admission_number
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. STD/2026/001"
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Admission Date *
                    </label>

                    <input
                      type="date"
                      name="admission_date"
                      value={
                        form.admission_date
                      }
                      onChange={
                        handleChange
                      }
                      required
                    />

                  </div>

                </div>

              </div>

              {/* =================================
                  PERSONAL INFORMATION
              ================================= */}

              <div className="form-section">

                <h3>
                  Personal Information
                </h3>

                <div className="form-grid">

                  <div className="form-group">

                    <label>
                      First Name *
                    </label>

                    <input
                      name="first_name"
                      value={form.first_name}
                      onChange={handleChange}
                      placeholder="Enter first name"
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Middle Name
                    </label>

                    <input
                      name="middle_name"
                      value={form.middle_name}
                      onChange={handleChange}
                      placeholder="Enter middle name"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Last Name *
                    </label>

                    <input
                      name="last_name"
                      value={form.last_name}
                      onChange={handleChange}
                      placeholder="Enter last name"
                      required
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Gender
                    </label>

                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                    >
                      <option value="">
                        Select gender
                      </option>

                      <option value="male">
                        Male
                      </option>

                      <option value="female">
                        Female
                      </option>

                      <option value="other">
                        Other
                      </option>
                    </select>

                  </div>

                  <div className="form-group">

                    <label>
                      Date of Birth
                    </label>

                    <input
                      type="date"
                      name="date_of_birth"
                      value={form.date_of_birth}
                      onChange={handleChange}
                    />

                  </div>

                </div>

              </div>

              {/* =================================
                  CONTACT INFORMATION
              ================================= */}

              <div className="form-section">

                <h3>
                  Contact Information
                </h3>

                <div className="form-grid">

                  <div className="form-group">

                    <label>
                      Email
                    </label>

                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="student@example.com"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Phone Number
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="07XXXXXXXX"
                    />

                  </div>

                  <div
                    className="form-group"
                    style={{
                      gridColumn: "1 / -1",
                    }}
                  >

                    <label>
                      Address
                    </label>

                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Enter student's address"
                      rows="3"
                    />

                  </div>

                </div>

              </div>

              {/* =================================
                  PARENT / GUARDIAN
              ================================= */}

              <div className="form-section">

                <h3>
                  Parent / Guardian Information
                </h3>

                <div className="form-grid">

                  <div className="form-group">

                    <label>
                      Guardian Name
                    </label>

                    <input
                      name="guardian_name"
                      value={form.guardian_name}
                      onChange={handleChange}
                      placeholder="Full name"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Guardian Phone
                    </label>

                    <input
                      type="tel"
                      name="guardian_phone"
                      value={form.guardian_phone}
                      onChange={handleChange}
                      placeholder="07XXXXXXXX"
                    />

                  </div>

                  <div className="form-group">

                    <label>
                      Guardian Email
                    </label>

                    <input
                      type="email"
                      name="guardian_email"
                      value={form.guardian_email}
                      onChange={handleChange}
                      placeholder="guardian@example.com"
                    />

                  </div>

                </div>

              </div>

              {/* =================================
                  ACADEMIC PLACEMENT
              ================================= */}

              <div className="form-section">

                <h3>
                  {placementTitle}
                </h3>

                <p
                  style={{
                    marginTop: "-6px",
                    marginBottom: "18px",
                    fontSize: "13px",
                    opacity: 0.7,
                  }}
                >
                  {isSchool
                    ? "Select the student's class or grade. Subjects for that class are managed through Academic Units."
                    : "Select a department first, then select the programme. Active units belonging to that programme will automatically be assigned to the student."}
                </p>

                {/* =================================
                    SCHOOL PLACEMENT
                ================================= */}

                {isSchool ? (

                  <div className="form-grid">

                    <div className="form-group">

                      <label>
                        {classLabel} *
                      </label>

                      <select
                        name="class_id"
                        value={form.class_id}
                        onChange={handleChange}
                        required
                      >

                        <option value="">
                          Select {classLabel.toLowerCase()}
                        </option>

                        {classes.map((classItem) => (

                          <option
                            key={classItem.id}
                            value={classItem.id}
                          >
                            {classItem.name}
                            {classItem.academic_year
                              ? ` — ${classItem.academic_year}`
                              : ""}
                            {classItem.term
                              ? ` — ${classItem.term}`
                              : ""}
                          </option>

                        ))}

                      </select>

                    </div>

                    {form.class_id && (

                      <div
                        style={{
                          gridColumn: "1 / -1",
                          marginTop: "4px",
                          padding: "16px",
                          borderRadius: "10px",
                          background: "#f8fafc",
                          border: "1px solid #e5e7eb",
                        }}
                      >

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                            marginBottom: "12px",
                          }}
                        >

                          <div>

                            <strong>
                              Subjects for this class
                            </strong>

                            <p
                              style={{
                                margin: "4px 0 0",
                                fontSize: "12px",
                                opacity: 0.65,
                              }}
                            >
                              Active subjects configured
                              under Academic Units.
                            </p>

                          </div>

                          <span
                            style={{
                              background: "#eef4ff",
                              color: "#064789",
                              padding: "5px 10px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            {
                              academicUnits.filter(
                                (unit) =>
                                  unit.class_id ===
                                    form.class_id &&
                                  unit.is_active !==
                                    false &&
                                  unit.unit_type ===
                                    "subject"
                              ).length
                            }{" "}
                            subjects
                          </span>

                        </div>

                        {academicUnits.filter(
                          (unit) =>
                            unit.class_id ===
                              form.class_id &&
                            unit.is_active !== false &&
                            unit.unit_type ===
                              "subject"
                        ).length === 0 ? (

                          <div
                            style={{
                              padding: "12px",
                              background: "#fff",
                              borderRadius: "8px",
                              color: "#6b7280",
                              fontSize: "13px",
                            }}
                          >
                            No subjects have been assigned
                            to this class yet. Add them
                            under Academic Units.
                          </div>

                        ) : (

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: "8px",
                            }}
                          >

                            {academicUnits
                              .filter(
                                (unit) =>
                                  unit.class_id ===
                                    form.class_id &&
                                  unit.is_active !==
                                    false &&
                                  unit.unit_type ===
                                    "subject"
                              )
                              .map((unit) => (

                                <div
                                  key={unit.id}
                                  style={{
                                    padding: "10px",
                                    background: "#fff",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "8px",
                                  }}
                                >

                                  <strong
                                    style={{
                                      color: "#064789",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {unit.code}
                                  </strong>

                                  <div
                                    style={{
                                      marginTop: "3px",
                                      fontSize: "13px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {unit.name}
                                  </div>

                                  {unit.academic_level && (

                                    <small
                                      style={{
                                        display: "block",
                                        marginTop: "4px",
                                        opacity: 0.6,
                                      }}
                                    >
                                      Level:{" "}
                                      {unit.academic_level}
                                    </small>

                                  )}

                                </div>

                              ))}

                          </div>

                        )}

                      </div>

                    )}

                  </div>

                ) : (

                  /* =================================
                     UNIVERSITY / COLLEGE / TVET
                  ================================= */

                  <div className="form-grid">

                    {/* DEPARTMENT */}

                    <div className="form-group">

                      <label>
                        Department *
                      </label>

                      <select
                        name="department_id"
                        value={form.department_id}
                        onChange={handleChange}
                        required
                      >

                        <option value="">
                          Select Department
                        </option>

                        {departments.map(
                          (department) => (

                            <option
                              key={department.id}
                              value={department.id}
                            >
                              {department.code
                                ? `${department.code} — `
                                : ""}
                              {department.name}
                            </option>

                          )
                        )}

                      </select>

                    </div>

                    {/* PROGRAMME */}

                    <div className="form-group">

                      <label>
                        Programme *
                      </label>

                      <select
                        name="programme_id"
                        value={form.programme_id}
                        onChange={handleChange}
                        disabled={!form.department_id}
                        required
                      >

                        <option value="">
                          {!form.department_id
                            ? "Select department first"
                            : "Select Programme"}
                        </option>

                        {availableProgrammes.map(
                          (programme) => (

                            <option
                              key={programme.id}
                              value={programme.id}
                            >
                              {programme.code
                                ? `${programme.code} — `
                                : ""}
                              {programme.name}
                            </option>

                          )
                        )}

                      </select>

                      {!form.department_id && (

                        <small
                          style={{
                            display: "block",
                            marginTop: "6px",
                            color: "#6b7280",
                          }}
                        >
                          Choose a department first to
                          see its programmes.
                        </small>

                      )}

                    </div>

                    {/* PROGRAMME UNITS */}

                    <div
                      style={{
                        gridColumn: "1 / -1",
                        marginTop: "4px",
                      }}
                    >

                      <div
                        style={{
                          padding: "18px",
                          borderRadius: "12px",
                          background:
                            "linear-gradient(135deg, #f8fbff, #ffffff)",
                          border:
                            "1px solid #dbe7f5",
                        }}
                      >

                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent:
                              "space-between",
                            gap: "15px",
                            marginBottom: "14px",
                          }}
                        >

                          <div>

                            <h4
                              style={{
                                margin: 0,
                                color: "#064789",
                              }}
                            >
                              Assigned Units / Subjects /
                              Modules
                            </h4>

                            <p
                              style={{
                                margin:
                                  "5px 0 0",
                                fontSize: "12px",
                                opacity: 0.65,
                              }}
                            >
                              These are the active
                              Academic Units belonging
                              to the selected programme.
                            </p>

                          </div>

                          <span
                            style={{
                              whiteSpace:
                                "nowrap",
                              background:
                                form.programme_id
                                  ? "#064789"
                                  : "#e5e7eb",
                              color:
                                form.programme_id
                                  ? "#fff"
                                  : "#6b7280",padding:
                                "6px 11px",
                              borderRadius:
                                "20px",
                              fontSize:
                                "12px",
                              fontWeight:
                                "700",
                            }}
                          >
                            {
                              selectedProgrammeUnits.length
                            }{" "}
                            {selectedProgrammeUnits.length ===
                            1
                              ? "Unit"
                              : "Units"}
                          </span>

                        </div>

                        {/* =================================
                            NO PROGRAMME SELECTED
                        ================================= */}

                        {!form.programme_id ? (

                          <div
                            style={{
                              padding: "18px",
                              background: "#fff",
                              borderRadius: "9px",
                              textAlign: "center",
                              color: "#6b7280",
                              border:
                                "1px dashed #cbd5e1",
                            }}
                          >

                            <div
                              style={{
                                fontSize: "25px",
                                marginBottom: "6px",
                              }}
                            >
                              📚
                            </div>

                            <strong>
                              Select a programme
                            </strong>

                            <p
                              style={{
                                margin: "5px 0 0",
                                fontSize: "12px",
                              }}
                            >
                              The student's units,
                              subjects or modules
                              will appear here
                              automatically.
                            </p>

                          </div>

                        ) : selectedProgrammeUnits.length ===
                          0 ? (

                          /* =================================
                              NO UNITS
                          ================================= */

                          <div
                            style={{
                              padding: "18px",
                              background: "#fff7ed",
                              border:
                                "1px solid #fed7aa",
                              borderRadius: "9px",
                              color: "#9a3412",
                            }}
                          >

                            <strong>
                              No Academic Units Found
                            </strong>

                            <p
                              style={{
                                margin: "5px 0 0",
                                fontSize: "12px",
                              }}
                            >
                              This programme does
                              not currently have any
                              active Academic Units.
                              Add the units under
                              Academic Units before
                              registering students.
                            </p>

                          </div>

                        ) : (

                          /* =================================
                              AVAILABLE PROGRAMME UNITS
                          ================================= */

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(240px, 1fr))",
                              gap: "9px",
                            }}
                          >

                            {selectedProgrammeUnits.map(
                              (unit) => (

                                <div
                                  key={unit.id}
                                  style={{
                                    background: "#fff",
                                    border:
                                      "1px solid #e5e7eb",
                                    borderRadius: "9px",
                                    padding: "12px",
                                  }}
                                >

                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent:
                                        "space-between",
                                      gap: "8px",
                                      alignItems:
                                        "flex-start",
                                    }}
                                  >

                                    <strong
                                      style={{
                                        color: "#064789",
                                        fontSize: "12px",
                                      }}
                                    >
                                      {unit.code}
                                    </strong>

                                    <span
                                      style={{
                                        fontSize: "10px",
                                        padding: "3px 7px",
                                        borderRadius: "12px",
                                        background:
                                          "#eef4ff",
                                        color: "#064789",
                                        fontWeight: "700",
                                      }}
                                    >
                                      {unit.unit_type ===
                                      "subject"
                                        ? "Subject"
                                        : unit.unit_type ===
                                          "course"
                                        ? "Course / Module"
                                        : "Course Unit"}
                                    </span>

                                  </div>

                                  <div
                                    style={{
                                      marginTop: "7px",
                                      fontWeight: "600",
                                      fontSize: "13px",
                                    }}
                                  >
                                    {unit.name}
                                  </div>

                                  {unit.academic_level && (

                                    <small
                                      style={{
                                        display: "block",
                                        marginTop: "5px",
                                        opacity: 0.6,
                                      }}
                                    >
                                      Academic Level:{" "}
                                      {unit.academic_level}
                                    </small>

                                  )}

                                  {unit.description && (

                                    <p
                                      style={{
                                        margin:
                                          "6px 0 0",
                                        fontSize: "11px",
                                        opacity: 0.6,
                                        lineHeight: "1.4",
                                      }}
                                    >
                                      {unit.description}
                                    </p>

                                  )}

                                </div>

                              )
                            )}

                          </div>

                        )}

                        {/* =================================
                            AUTO ASSIGNMENT MESSAGE
                        ================================= */}

                        {form.programme_id &&
                          selectedProgrammeUnits.length >
                            0 && (

                            <div
                              style={{
                                marginTop: "14px",
                                padding: "10px 12px",
                                borderRadius: "8px",
                                background: "#ecfdf5",
                                color: "#166534",
                                fontSize: "12px",
                                lineHeight: "1.5",
                              }}
                            >
                              ✓ All{" "}
                              {
                                selectedProgrammeUnits.length
                              }{" "}
                              active{" "}
                              {selectedProgrammeUnits.length ===
                              1
                                ? "unit"
                                : "units"}{" "}
                              shown above will be
                              automatically assigned
                              to this student when the
                              registration is saved.
                            </div>

                          )}

                      </div>

                    </div>

                    {/* =================================
                        OPTIONAL CLASS
                    ================================= */}

                    <div className="form-group">

                      <label>
                        Class
                        <span
                          style={{
                            fontWeight: "400",
                            opacity: 0.6,
                          }}
                        >
                          {" "}
                          (Optional)
                        </span>
                      </label>

                      <select
                        name="class_id"
                        value={form.class_id}
                        onChange={handleChange}
                      >

                        <option value="">
                          Select Class
                        </option>

                        {classes.map(
                          (classItem) => (

                            <option
                              key={classItem.id}
                              value={classItem.id}
                            >
                              {classItem.name}

                              {classItem.academic_year
                                ? ` — ${classItem.academic_year}`
                                : ""}

                              {classItem.term
                                ? ` — ${classItem.term}`
                                : ""}

                            </option>

                          )
                        )}

                      </select>

                    </div>

                  </div>

                )}

              </div>

              {/* =========================================
                  STUDENT STATUS
              ========================================= */}

              <div className="form-section">

                <h3>
                  Student Status
                </h3>

                <div className="form-grid">

                  <div className="form-group">

                    <label>
                      Status *
                    </label>

                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      required
                    >

                      <option value="active">
                        Active
                      </option>

                      <option value="inactive">
                        Inactive
                      </option>

                      <option value="graduated">
                        Graduated
                      </option>

                      <option value="transferred">
                        Transferred
                      </option>

                      <option value="suspended">
                        Suspended
                      </option>

                    </select>

                  </div>

                </div>

              </div>

              {/* =========================================
                  FORM ACTIONS
              ========================================= */}

              <div
                className="form-actions"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  paddingTop: "8px",
                }}
              >

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? editingStudent
                      ? "Updating..."
                      : "Registering..."
                    : editingStudent
                    ? "Update Student"
                    : "Register Student"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

export default Students;