import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

function TeachingAssignments() {
  const [institutionId, setInstitutionId] = useState(null);

  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [academicUnits, setAcademicUnits] = useState([]);
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [form, setForm] = useState({
    staff_id: "",
    department_id: "",
    programme_id: "",
    academic_unit_id: "",
    class_id: "",
    academic_year: "",
    term: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You are not logged in.");
      setLoading(false);
      return;
    }

    const { data: membership, error: membershipError } = await supabase
      .from("institution_members")
      .select("institution_id")
      .eq("user_id", user.id)
      .eq("role", "institution_admin")
      .eq("is_active", true)
      .single();

    if (membershipError || !membership) {
      setMessage("Institution information could not be loaded.");
      setLoading(false);
      return;
    }

    setInstitutionId(membership.institution_id);

    await Promise.all([
      loadStaff(membership.institution_id),
      loadDepartments(membership.institution_id),
      loadProgrammes(membership.institution_id),
      loadAcademicUnits(membership.institution_id),
      loadClasses(membership.institution_id),
      loadAssignments(membership.institution_id),
    ]);

    setLoading(false);
  }

  async function loadStaff(id) {
    const { data, error } = await supabase
      .from("staff")
      .select("id, full_name, staff_number, staff_role")
      .eq("institution_id", id)
      .eq("is_active", true)
      .order("full_name");

    if (error) {
      setMessage(error.message);
      return;
    }

    setStaff(data || []);
  }

  async function loadDepartments(id) {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, code")
      .eq("institution_id", id)
      .order("name");

    if (error) {
      setMessage(error.message);
      return;
    }

    setDepartments(data || []);
  }

  async function loadProgrammes(id) {
    const { data, error } = await supabase
      .from("programmes")
      .select("id, name, code, department_id")
      .eq("institution_id", id)
      .order("name");

    if (error) {
      setMessage(error.message);
      return;
    }

    setProgrammes(data || []);
  }

  async function loadAcademicUnits(id) {
    const { data, error } = await supabase
      .from("academic_units")
      .select("id, name, code, unit_type, department_id, programme_id")
      .eq("institution_id", id)
      .order("name");

    if (error) {
      setMessage(error.message);
      return;
    }

    setAcademicUnits(data || []);
  }

  async function loadClasses(id) {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, academic_year, term, department_id, programme_id")
      .eq("institution_id", id)
      .order("name");

    if (error) {
      setMessage(error.message);
      return;
    }

    setClasses(data || []);
  }

  async function loadAssignments(id) {
    const { data, error } = await supabase
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
        staff:staff_id (
          full_name,
          staff_number,
          staff_role
        ),
        department:department_id (
          name,
          code
        ),
        programme:programme_id (
          name,
          code
        ),
        academic_unit:academic_unit_id (
          name,
          code
        ),
        class:class_id (
          name
        )
      `)
      .eq("institution_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setAssignments(data || []);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm({
      staff_id: "",
      department_id: "",
      programme_id: "",
      academic_unit_id: "",
      class_id: "",
      academic_year: "",
      term: "",
    });

    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!institutionId) {
      setMessage("Institution information is missing.");
      return;
    }

    if (!form.staff_id) {
      setMessage("Please select a staff member.");
      return;
    }

    if (!form.academic_unit_id) {
      setMessage("Please select an academic unit or subject.");
      return;
    }

    if (!form.academic_year) {
      setMessage("Please enter the academic year.");
      return;
    }

    if (!form.term) {
      setMessage("Please select a term.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      institution_id: institutionId,
      staff_id: form.staff_id,
      department_id: form.department_id || null,
      programme_id: form.programme_id || null,
      academic_unit_id: form.academic_unit_id,
      class_id: form.class_id || null,
      academic_year: form.academic_year,
      term: form.term,
    };

    let error;

    if (editingId) {
      const result = await supabase
        .from("staff_teaching_assignments")
        .update(payload)
        .eq("id", editingId)
        .eq("institution_id", institutionId);

      error = result.error;
    } else {
      const result = await supabase
        .from("staff_teaching_assignments")
        .insert([payload]);

      error = result.error;
    }

    if (error) {
      if (error.code === "23505") {
        setMessage(
          "This teaching assignment already exists for the selected staff member."
        );
      } else {
        setMessage(error.message);
      }

      setSaving(false);
      return;
    }

    setMessage(
      editingId
        ? "Teaching assignment updated successfully."
        : "Teaching assignment created successfully."
    );

    resetForm();
    await loadAssignments(institutionId);

    setSaving(false);
  }

  function handleEdit(assignment) {
    setEditingId(assignment.id);

    setForm({
      staff_id: assignment.staff_id || "",
      department_id: assignment.department_id || "",
      programme_id: assignment.programme_id || "",
      academic_unit_id: assignment.academic_unit_id || "",
      class_id: assignment.class_id || "",
      academic_year: assignment.academic_year || "",
      term: assignment.term || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function toggleAssignment(assignment) {
    const newStatus = !assignment.is_active;

    const { error } = await supabase
      .from("staff_teaching_assignments")
      .update({
        is_active: newStatus,
      })
      .eq("id", assignment.id)
      .eq("institution_id", institutionId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      newStatus
        ? "Teaching assignment activated."
        : "Teaching assignment deactivated."
    );

    await loadAssignments(institutionId);
  }

  async function deleteAssignment(id) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this teaching assignment?"
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("staff_teaching_assignments")
      .delete()
      .eq("id", id)
      .eq("institution_id", institutionId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Teaching assignment deleted successfully.");

    await loadAssignments(institutionId);
  }

  const filteredProgrammes = form.department_id
    ? programmes.filter(
        (programme) => programme.department_id === form.department_id
      )
    : programmes;

  const filteredAcademicUnits = academicUnits.filter((unit) => {
    if (
      form.department_id &&
      unit.department_id &&
      unit.department_id !== form.department_id
    ) {
      return false;
    }

    if (
      form.programme_id &&
      unit.programme_id &&
      unit.programme_id !== form.programme_id
    ) {
      return false;
    }

    return true;
  });

  const filteredClasses = classes.filter((classItem) => {
    if (
      form.department_id &&
      classItem.department_id &&
      classItem.department_id !== form.department_id
    ) {
      return false;
    }

    if (
      form.programme_id &&
      classItem.programme_id &&
      classItem.programme_id !== form.programme_id
    ) {
      return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="teaching-assignment-loading">
        Loading teaching assignments...
      </div>
    );
  }

  return (
    <div className="teaching-assignment-page">
      <div className="teaching-assignment-page-header">
        <h1>Teaching Assignments</h1>
        <p>
          Assign staff members to the subjects, programmes and classes they
          teach.
        </p>
      </div>

      {message && (
        <div className="teaching-assignment-message">
          {message}
        </div>
      )}

      <div className="teaching-assignment-form-card">
        <h2>{editingId ? "Edit Teaching Assignment" : "Assign Staff"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="teaching-assignment-form-grid">

            <div>
              <label>Staff Member</label>

              <select
                name="staff_id"
                value={form.staff_id}
                onChange={handleChange}
                required
              >
                <option value="">Select staff member</option>

                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                    {member.staff_number
                      ? ` — ${member.staff_number}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Department</label>

              <select
                name="department_id"
                value={form.department_id}
                onChange={(event) => {
                  setForm((previous) => ({
                    ...previous,
                    department_id: event.target.value,
                    programme_id: "",
                    academic_unit_id: "",
                    class_id: "",
                  }));
                }}
              >
                <option value="">Select department</option>

                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                    {department.code
                      ? ` (${department.code})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Programme</label>

              <select
                name="programme_id"
                value={form.programme_id}
                onChange={(event) => {
                  setForm((previous) => ({
                    ...previous,
                    programme_id: event.target.value,
                    academic_unit_id: "",
                    class_id: "",
                  }));
                }}
              >
                <option value="">Select programme</option>

                {filteredProgrammes.map((programme) => (
                  <option key={programme.id} value={programme.id}>
                    {programme.name}
                    {programme.code
                      ? ` (${programme.code})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Academic Unit / Subject</label>

              <select
                name="academic_unit_id"
                value={form.academic_unit_id}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select academic unit / subject
                </option>

                {filteredAcademicUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.code} — {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Class</label>

              <select
                name="class_id"
                value={form.class_id}
                onChange={handleChange}
              >
                <option value="">Select class</option>

                {filteredClasses.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name}
                    {classItem.academic_year
                      ? ` — ${classItem.academic_year}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Academic Year</label>

              <input
                type="text"
                name="academic_year"
                value={form.academic_year}
                onChange={handleChange}
                placeholder="e.g. 2026"
                required
              />
            </div>

            <div>
              <label>Term / Semester</label>

              <select
                name="term"
                value={form.term}
                onChange={handleChange}
                required
              >
                <option value="">Select term / semester</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
              </select>
            </div>

          </div>

          <div className="teaching-assignment-form-actions">
            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                ? "Update Assignment"
                : "Assign Staff"}
            </button>

            {editingId && (
              <button
                type="button"
                className="teaching-assignment-cancel-button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="teaching-assignment-table-card">
        <div className="teaching-assignment-table-header">
          <div>
            <h2>Current Teaching Assignments</h2>
            <p>
              {assignments.length} assignment
              {assignments.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="teaching-assignment-empty">
            <h3>No teaching assignments yet</h3>
            <p>
              Assign a staff member to an academic unit or subject above.
            </p>
          </div>
        ) : (
          <div className="teaching-assignment-table-wrapper">
            <table className="teaching-assignment-table">
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Department</th>
                  <th>Programme</th>
                  <th>Academic Unit</th>
                  <th>Class</th>
                  <th>Academic Year</th>
                  <th>Term</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <strong>
                        {assignment.staff?.full_name || "—"}
                      </strong>

                      {assignment.staff?.staff_number && (
                        <small>
                          {assignment.staff.staff_number}
                        </small>
                      )}
                    </td>

                    <td>
                      {assignment.department?.name || "—"}
                    </td>

                    <td>
                      {assignment.programme?.name || "—"}
                    </td>

                    <td>
                      {assignment.academic_unit
                        ? `${assignment.academic_unit.code} — ${assignment.academic_unit.name}`
                        : "—"}
                    </td>

                    <td>
                      {assignment.class?.name || "—"}
                    </td>

                    <td>
                      {assignment.academic_year || "—"}
                    </td>

                    <td>
                      {assignment.term || "—"}
                    </td>

                    <td>
                      <span
                        className={
                          assignment.is_active
                            ? "teaching-assignment-status-active"
                            : "teaching-assignment-status-inactive"
                        }
                      >
                        {assignment.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="teaching-assignment-actions">
                        <button
                          className="teaching-assignment-edit-button"
                          onClick={() => handleEdit(assignment)}
                        >
                          Edit
                        </button>

                        <button
                          className="teaching-assignment-toggle-button"
                          onClick={() =>
                            toggleAssignment(assignment)
                          }
                        >
                          {assignment.is_active
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          className="teaching-assignment-delete-button"
                          onClick={() =>
                            deleteAssignment(assignment.id)
                          }
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
      </div>
    </div>
  );
}

export default TeachingAssignments;