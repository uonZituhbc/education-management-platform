import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";

function Classes() {
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [institution, setInstitution] = useState(null);

  const [institutionId, setInstitutionId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [termFilter, setTermFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  const emptyForm = {
    name: "",
    department_id: "",
    programme_id: "",
    academic_year: "",
    term: "",
  };

  const [form, setForm] = useState(emptyForm);

  /*
   * ---------------------------------------------------------
   * INSTITUTION TYPE HELPERS
   * ---------------------------------------------------------
   */

  const institutionType =
    institution?.institution_type?.toLowerCase() || "";

  const isPrimary =
    ["primary", "school"].includes(institutionType);

  const isJuniorSecondary =
    ["junior_secondary", "junior"].includes(institutionType);

  const isSecondary =
    institutionType === "secondary";

  const isHigherEducation =
    ["university", "college", "tvet"].includes(
      institutionType
    );

  const isTVET =
    institutionType === "tvet";

  const classNameLabel = isPrimary || isJuniorSecondary
    ? "Grade"
    : isSecondary
    ? "Form"
    : isTVET
    ? "Level"
    : "Class / Year";

  const classPlaceholder = isPrimary
    ? "e.g. Grade 1"
    : isJuniorSecondary
    ? "e.g. Grade 7"
    : isSecondary
    ? "e.g. Form 1"
    : isTVET
    ? "e.g. Level 1"
    : "e.g. Year 1";

  /*
   * ---------------------------------------------------------
   * LOAD DATA
   * ---------------------------------------------------------
   */

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
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
        setLoading(false);
        return;
      }

      const {
        data: membership,
        error: membershipError,
      } = await supabase
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
        setLoading(false);
        return;
      }

      setInstitutionId(membership.institution_id);

      /*
       * Load institution
       */

      const {
        data: institutionData,
        error: institutionError,
      } = await supabase
        .from("institutions")
        .select(
          "id, name, institution_type, email, phone, address, logo_url, is_active"
        )
        .eq("id", membership.institution_id)
        .maybeSingle();

      if (institutionError) throw institutionError;

      setInstitution(institutionData);

      /*
       * Load classes
       */

      const {
        data: classData,
        error: classError,
      } = await supabase
        .from("classes")
        .select(`
          *,
          departments (
            id,
            name
          ),
          programmes (
            id,
            name,
            code
          )
        `)
        .eq("institution_id", membership.institution_id)
        .order("created_at", {
          ascending: false,
        });

      if (classError) throw classError;

      /*
       * Load students separately.
       *
       * This avoids depending on a foreign-key
       * relationship from classes -> students.
       */

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select("id, class_id")
        .eq("institution_id", membership.institution_id);

      if (studentError) throw studentError;

      const studentCounts = {};

      (studentData || []).forEach((student) => {
        if (!student.class_id) return;

        studentCounts[student.class_id] =
          (studentCounts[student.class_id] || 0) + 1;
      });

      const classesWithCounts = (classData || []).map(
        (classItem) => ({
          ...classItem,
          student_count:
            studentCounts[classItem.id] || 0,
        })
      );

      setClasses(classesWithCounts);

      /*
       * Load departments
       */

      const {
        data: departmentData,
        error: departmentError,
      } = await supabase
        .from("departments")
        .select("id, name")
        .eq("institution_id", membership.institution_id)
        .order("name");

      if (departmentError) throw departmentError;

      setDepartments(departmentData || []);

      /*
       * Load programmes
       */

      const {
        data: programmeData,
        error: programmeError,
      } = await supabase
        .from("programmes")
        .select(
          "id, name, code, department_id"
        )
        .eq(
          "institution_id",
          membership.institution_id
        )
        .order("name");

      if (programmeError) throw programmeError;

      setProgrammes(programmeData || []);
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Failed to load classes."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * FORM HANDLING
   * ---------------------------------------------------------
   */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "department_id"
        ? { programme_id: "" }
        : {}),
    }));
  };

  const openAddForm = () => {
    setEditingClass(null);

    setForm({
      ...emptyForm,
      academic_year:
        new Date().getFullYear().toString(),
    });

    setMessage("");
    setShowForm(true);
  };

  const openEditForm = (classItem) => {
    setEditingClass(classItem);

    setForm({
      name: classItem.name || "",
      department_id:
        classItem.department_id || "",
      programme_id:
        classItem.programme_id || "",
      academic_year:
        classItem.academic_year || "",
      term: classItem.term || "",
    });

    setMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingClass(null);
    setForm(emptyForm);
  };

  /*
   * ---------------------------------------------------------
   * SAVE CLASS
   * ---------------------------------------------------------
   */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!institutionId) {
      setMessage(
        "Institution information is missing."
      );
      return;
    }

    if (!form.name.trim()) {
      setMessage(
        `${classNameLabel} name is required.`
      );
      return;
    }

    if (!form.academic_year.trim()) {
      setMessage(
        "Academic year is required."
      );
      return;
    }

    if (!form.term.trim()) {
      setMessage(
        "Term / semester is required."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const classData = {
        institution_id: institutionId,
        name: form.name.trim(),
        department_id:
          form.department_id || null,
        programme_id:
          form.programme_id || null,
        academic_year:
          form.academic_year.trim() || null,
        term:
          form.term.trim() || null,
      };

      if (editingClass) {
        const { error } = await supabase
          .from("classes")
          .update(classData)
          .eq("id", editingClass.id)
          .eq(
            "institution_id",
            institutionId
          );

        if (error) throw error;

        setMessage(
          `${classNameLabel} updated successfully.`
        );
      } else {
        const { error } = await supabase
          .from("classes")
          .insert(classData);

        if (error) throw error;

        setMessage(
          `${classNameLabel} created successfully.`
        );
      }

      closeForm();
      await loadClasses();
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          `Failed to save ${classNameLabel.toLowerCase()}.`
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * DELETE CLASS
   * ---------------------------------------------------------
   */

  const handleDelete = async (classItem) => {
    const studentCount =
      classItem.student_count || 0;

    const confirmed = window.confirm(
      `Delete "${classItem.name}"?\n\n` +
        `${
          studentCount > 0
            ? `${studentCount} student(s) are currently assigned to this class. Their class assignment may be removed depending on your database rules.\n\n`
            : ""
        }` +
        "This action cannot be undone."
    );

    if (!confirmed) return;

    setMessage("");

    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classItem.id)
        .eq(
          "institution_id",
          institutionId
        );

      if (error) throw error;

      setMessage(
        `${classNameLabel} deleted successfully.`
      );

      await loadClasses();
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          `Failed to delete ${classNameLabel.toLowerCase()}.`
      );
    }
  };

  /*
   * ---------------------------------------------------------
   * PROGRAMME FILTER
   * ---------------------------------------------------------
   */

  const filteredProgrammes = useMemo(() => {
    if (!form.department_id) {
      return programmes;
    }

    return programmes.filter(
      (programme) =>
        programme.department_id ===
        form.department_id
    );
  }, [
    programmes,
    form.department_id,
  ]);

  /*
   * ---------------------------------------------------------
   * CLASS FILTER
   * ---------------------------------------------------------
   */

  const filteredClasses = useMemo(() => {
    const searchText =
      search.toLowerCase().trim();

    return classes.filter((classItem) => {
      const matchesSearch =
        !searchText ||
        (classItem.name || "")
          .toLowerCase()
          .includes(searchText) ||
        (classItem.academic_year || "")
          .toLowerCase()
          .includes(searchText) ||
        (classItem.term || "")
          .toLowerCase()
          .includes(searchText) ||
        (classItem.departments?.name || "")
          .toLowerCase()
          .includes(searchText) ||
        (classItem.programmes?.name || "")
          .toLowerCase()
          .includes(searchText);

      const matchesTerm =
        termFilter === "all" ||
        classItem.term === termFilter;

      const matchesYear =
        yearFilter === "all" ||
        classItem.academic_year === yearFilter;

      return (
        matchesSearch &&
        matchesTerm &&
        matchesYear
      );
    });
  }, [
    classes,
    search,
    termFilter,
    yearFilter,
  ]);

  /*
   * ---------------------------------------------------------
   * ACADEMIC YEARS
   * ---------------------------------------------------------
   */

  const academicYears = useMemo(() => {
    return [
      ...new Set(
        classes
          .map(
            (item) =>
              item.academic_year
          )
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      b.localeCompare(a)
    );
  }, [classes]);

  /*
   * ---------------------------------------------------------
   * STATISTICS
   * ---------------------------------------------------------
   */

  const totalClasses = classes.length;

  const currentYear =
    new Date()
      .getFullYear()
      .toString();

  const currentYearClasses =
    classes.filter(
      (item) =>
        item.academic_year ===
        currentYear
    ).length;

  const classesWithProgramme =
    classes.filter(
      (item) =>
        item.programme_id
    ).length;

  const classesWithoutProgramme =
    classes.filter(
      (item) =>
        !item.programme_id
    ).length;

  const totalStudents =
    classes.reduce(
      (total, classItem) =>
        total +
        (classItem.student_count || 0),
      0
    );

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="dashboard-loading">
        <h2>Loading Classes...</h2>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div className="module-page">
      <div className="module-header">
        <div>
          <h1>
            {isPrimary
              ? "Grades"
              : isJuniorSecondary
              ? "Grades"
              : isSecondary
              ? "Forms"
              : "Classes"}
          </h1>

          <p>
            Manage academic{" "}
            {isPrimary ||
            isJuniorSecondary
              ? "grades"
              : isSecondary
              ? "forms"
              : "classes"}{" "}
            and academic periods.
          </p>

          {institution && (
            <small
              style={{
                display: "block",
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
          + Add {classNameLabel}
        </button>
      </div>

      {message && (
        <div className="module-message">
          {message}
        </div>
      )}

      <div className="module-stats">
        <div className="module-stat-card">
          <span>🏫</span>

          <div>
            <p>
              Total{" "}
              {isPrimary ||
              isJuniorSecondary
                ? "Grades"
                : isSecondary
                ? "Forms"
                : "Classes"}
            </p>

            <strong>
              {totalClasses}
            </strong>
          </div>
        </div>

        <div className="module-stat-card">
          <span>📅</span>

          <div>
            <p>
              {currentYear} Classes
            </p>

            <strong>
              {currentYearClasses}
            </strong>
          </div>
        </div>

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
          <span>📚</span>

          <div>
            <p>With Programme</p>

            <strong>
              {classesWithProgramme}
            </strong>
          </div>
        </div>
      </div>

      <div className="module-toolbar">
        <input
          type="search"
          placeholder={`Search ${classNameLabel.toLowerCase()}s, departments, programmes...`}
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          value={yearFilter}
          onChange={(e) =>
            setYearFilter(e.target.value)
          }
        >
          <option value="all">
            All Academic Years
          </option>

          {academicYears.map((year) => (
            <option
              key={year}
              value={year}
            >
              {year}
            </option>
          ))}
        </select>

        <select
          value={termFilter}
          onChange={(e) =>
            setTermFilter(e.target.value)
          }
        >
          <option value="all">
            All Terms
          </option>

          <option value="Term 1">
            Term 1
          </option>

          <option value="Term 2">
            Term 2
          </option>

          <option value="Term 3">
            Term 3
          </option>

          <option value="Semester 1">
            Semester 1
          </option>

          <option value="Semester 2">
            Semester 2
          </option>

          <option value="Semester 3">
            Semester 3
          </option>
        </select>
      </div>

      <div className="module-table-card">
        <div className="module-table-header">
          <div>
            <h2>
              {isPrimary ||
              isJuniorSecondary
                ? "Grade Records"
                : isSecondary
                ? "Form Records"
                : "Class Records"}
            </h2>

            <p>
              Showing{" "}
              {filteredClasses.length}{" "}
              of {classes.length}{" "}
              records
            </p>
          </div>
        </div>

        {filteredClasses.length ===
        0 ? (
          <div className="module-empty">
            <div>🏫</div>

            <h3>
              No{" "}
              {classNameLabel.toLowerCase()}
              s found
            </h3>

            <p>
              {classes.length === 0
                ? `Create your first ${classNameLabel.toLowerCase()} to get started.`
                : "Try changing your search or filters."}
            </p>

            {classes.length ===
              0 && (
              <button
                className="primary-button"
                onClick={
                  openAddForm
                }
              >
                + Create{" "}
                {classNameLabel}
              </button>
            )}
          </div>
        ) : (
          <div className="module-table-wrapper">
            <table className="module-table">
              <thead>
                <tr>
                  <th>
                    {classNameLabel}
                  </th>

                  <th>
                    Department
                  </th>

                  <th>
                    Programme
                  </th>

                  <th>
                    Academic Year
                  </th>

                  <th>
                    Term
                  </th>

                  <th>
                    Students
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredClasses.map(
                  (classItem) => (
                    <tr
                      key={
                        classItem.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            classItem.name
                          }
                        </strong>
                      </td>

                      <td>
                        {classItem
                          .departments
                          ?.name ||
                          "—"}
                      </td>

                      <td>
                        {classItem
                          .programmes
                          ?.code
                          ? `${classItem.programmes.code} — ${classItem.programmes.name}`
                          : classItem
                              .programmes
                              ?.name ||
                            "—"}
                      </td>

                      <td>
                        {classItem.academic_year ||
                          "—"}
                      </td>

                      <td>
                        {classItem.term ||
                          "—"}
                      </td>

                      <td>
                        <strong>
                          {classItem.student_count ||
                            0}
                        </strong>
                      </td>

                      <td>
                        <div className="table-actions">
                          <button
                            onClick={() =>
                              openEditForm(
                                classItem
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="danger-action"
                            onClick={() =>
                              handleDelete(
                                classItem
                              )
                            }
                          >
                            Delete
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

      {showForm && (
        <div className="modal-overlay">
          <div className="module-modal">
            <div className="module-modal-header">
              <div>
                <h2>
                  {editingClass
                    ? `Edit ${classNameLabel}`
                    : `Create ${classNameLabel}`}
                </h2>

                <p>
                  {editingClass
                    ? `Update the ${classNameLabel.toLowerCase()} information.`
                    : `Enter the ${classNameLabel.toLowerCase()} information below.`}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeForm}
              >
                ×
              </button>
            </div>

            <form
              className="student-form"
              onSubmit={handleSubmit}
            >
              <div className="form-section">
                <h3>
                  {classNameLabel} Information
                </h3>

                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      {classNameLabel} Name *
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder={classPlaceholder}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Academic Year *
                    </label>

                    <input
                      type="text"
                      name="academic_year"
                      value={form.academic_year}
                      onChange={handleChange}
                      placeholder="e.g. 2026"
                      required
                    />
                  </div>

                  {isHigherEducation && (
                    <>
                      <div className="form-group">
                        <label>
                          Department
                        </label>

                        <select
                          name="department_id"
                          value={
                            form.department_id
                          }
                          onChange={handleChange}
                        >
                          <option value="">
                            Select department
                          </option>

                          {departments.map(
                            (department) => (
                              <option
                                key={department.id}
                                value={department.id}
                              >
                                {department.name}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>
                          Programme
                        </label>

                        <select
                          name="programme_id"
                          value={
                            form.programme_id
                          }
                          onChange={handleChange}
                        >
                          <option value="">
                            Select programme
                          </option>

                          {filteredProgrammes.map(
                            (programme) => (
                              <option
                                key={programme.id}
                                value={programme.id}
                              >
                                {programme.code
                                  ? `${programme.code} — ${programme.name}`
                                  : programme.name}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label>
                      Term / Semester *
                    </label>

                    <select
                      name="term"
                      value={form.term}
                      onChange={handleChange}
                      required
                    >
                      <option value="">
                        Select term / semester
                      </option>

                      <option value="Term 1">
                        Term 1
                      </option>

                      <option value="Term 2">
                        Term 2
                      </option>

                      <option value="Term 3">
                        Term 3
                      </option>

                      <option value="Semester 1">
                        Semester 1
                      </option>

                      <option value="Semester 2">
                        Semester 2
                      </option>

                      <option value="Semester 3">
                        Semester 3
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-actions">
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
                    ? "Saving..."
                    : editingClass
                    ? "Update " + classNameLabel
                    : "Create " + classNameLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Classes;