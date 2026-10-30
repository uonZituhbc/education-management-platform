import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

function TeachingAssignments() {
  const [institutionId, setInstitutionId] = useState(null);
  const [institutionType, setInstitutionType] = useState("");

  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [academicUnits, setAcademicUnits] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selectedSubjectAssignments, setSelectedSubjectAssignments] =
    useState([]);

  const [form, setForm] = useState({
    staff_id: "",
    department_id: "",
    programme_id: "",
    academic_unit_id: "",
    class_id: "",
    academic_year: "",
    term: "",
  });

  const [editingGroup, setEditingGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const schoolTypes = [
    "primary",
    "school",
    "junior",
    "junior_secondary",
    "secondary",
  ];

  const isSchool = schoolTypes.includes(institutionType);
  const academicPeriodLabel = isSchool ? "Term" : "Semester";

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You are not logged in.");

      const { data: membership, error: membershipError } =
        await supabase
          .from("institution_members")
          .select("institution_id")
          .eq("user_id", user.id)
          .eq("role", "institution_admin")
          .eq("is_active", true)
          .single();

      if (membershipError) throw membershipError;
      if (!membership) {
        throw new Error("Institution information could not be loaded.");
      }

      const id = membership.institution_id;
      setInstitutionId(id);

      const { data: institution, error: institutionError } =
        await supabase
          .from("institutions")
          .select("institution_type")
          .eq("id", id)
          .single();

      if (institutionError) throw institutionError;

      setInstitutionType(
        institution?.institution_type?.toLowerCase() || ""
      );

      await Promise.all([
        loadStaff(id),
        loadDepartments(id),
        loadProgrammes(id),
        loadAcademicUnits(id),
        loadClasses(id),
        loadAssignments(id),
        loadSubjects(id),
      ]);
    } catch (error) {
      setMessage(error.message || "Failed to load teaching assignments.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStaff(id) {
    const { data, error } = await supabase
      .from("staff")
      .select("id, full_name, staff_number, staff_role")
      .eq("institution_id", id)
      .eq("is_active", true)
      .order("full_name");

    if (error) throw error;
    setStaff(data || []);
  }

  async function loadDepartments(id) {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, code")
      .eq("institution_id", id)
      .order("name");

    if (error) throw error;
    setDepartments(data || []);
  }

  async function loadProgrammes(id) {
    const { data, error } = await supabase
      .from("programmes")
      .select("id, name, code, department_id")
      .eq("institution_id", id)
      .order("name");

    if (error) throw error;
    setProgrammes(data || []);
  }

  async function loadAcademicUnits(id) {
    const { data, error } = await supabase
      .from("academic_units")
      .select("id, name, code, unit_type, department_id, programme_id")
      .eq("institution_id", id)
      .order("name");

    if (error) throw error;
    setAcademicUnits(data || []);
  }

  async function loadClasses(id) {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, academic_year, term, department_id, programme_id")
      .eq("institution_id", id)
      .order("name");

    if (error) throw error;
    setClasses(data || []);
  }

  async function loadSubjects(id) {
    const { data, error } = await supabase
      .from("subject_assignments")
      .select(`
        id,
        subject_id,
        class_id,
        academic_year,
        term,
        is_active,
        subjects (
          id,
          name,
          code,
          is_active
        ),
        classes (
          id,
          name
        )
      `)
      .eq("institution_id", id)
      .eq("is_active", true)
      .order("created_at");

    if (error) throw error;

    setSubjects(
      (data || []).filter(
        (item) => item.subjects?.is_active !== false
      )
    );
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
        subject_assignment_id,
        class_id,
        academic_year,
        term,
        is_active,
        created_at,
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
        subject_assignment:subject_assignment_id (
          id,
          subjects (
            name,
            code
          ),
          classes (
            name
          )
        ),
        class:class_id (
          name
        )
      `)
      .eq("institution_id", id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setAssignments(data || []);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function toggleSubjectAssignment(id) {
    setSelectedSubjectAssignments((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
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

    setSelectedSubjectAssignments([]);
    setEditingGroup(null);
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

    if (!form.academic_year.trim()) {
      setMessage("Please enter the academic year.");
      return;
    }

    if (!form.term) {
      setMessage(`Please select ${academicPeriodLabel.toLowerCase()}.`);
      return;
    }

    if (isSchool && selectedSubjectAssignments.length === 0) {
      setMessage("Please select at least one subject and class.");
      return;
    }

    if (!isSchool && !form.academic_unit_id) {
      setMessage("Please select an academic unit.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      if (isSchool) {
        const selectedSubjects = selectedSubjectAssignments
          .map((id) => subjects.find((item) => item.id === id))
          .filter(Boolean);

        if (selectedSubjects.length !== selectedSubjectAssignments.length) {
          throw new Error("One or more selected subjects could not be found.");
        }

        if (editingGroup) {
          const selectedIds = selectedSubjects.map((item) => item.id);

          const idsToDelete = editingGroup.assignments
            .filter(
              (item) => !selectedIds.includes(item.subject_assignment_id)
            )
            .map((item) => item.id);

          const existingSubjectIds = editingGroup.assignments
            .map((item) => item.subject_assignment_id)
            .filter(Boolean);

          const idsToInsert = selectedIds.filter(
            (id) => !existingSubjectIds.includes(id)
          );

          if (idsToDelete.length > 0) {
            const { error } = await supabase
              .from("staff_teaching_assignments")
              .delete()
              .in("id", idsToDelete)
              .eq("institution_id", institutionId);

            if (error) throw error;
          }

          const retainedAssignments = editingGroup.assignments.filter(
            (item) => selectedIds.includes(item.subject_assignment_id)
          );

          if (retainedAssignments.length > 0) {
            const { error } = await supabase
              .from("staff_teaching_assignments")
              .update({
                staff_id: form.staff_id,
                department_id: form.department_id || null,
                academic_year: form.academic_year,
                term: form.term,
              })
              .in(
                "id",
                retainedAssignments.map((item) => item.id)
              )
              .eq("institution_id", institutionId);

            if (error) throw error;
          }

          const payload = idsToInsert.map((id) => {
            const selected = subjects.find((item) => item.id === id);

            return {
              institution_id: institutionId,
              staff_id: form.staff_id,
              subject_assignment_id: id,
              academic_unit_id: null,
              department_id: form.department_id || null,
              programme_id: null,
              class_id: selected.class_id,
              academic_year: form.academic_year,
              term: form.term,
              is_active: true,
            };
          });

          if (payload.length > 0) {
            const { error } = await supabase
              .from("staff_teaching_assignments")
              .insert(payload);

            if (error) throw error;
          }
        } else {
          const payload = selectedSubjects.map((selected) => ({
            institution_id: institutionId,
            staff_id: form.staff_id,
            subject_assignment_id: selected.id,
            academic_unit_id: null,
            department_id: form.department_id || null,
            programme_id: null,
            class_id: selected.class_id,
            academic_year: form.academic_year,
            term: form.term,
            is_active: true,
          }));

          const { error } = await supabase
            .from("staff_teaching_assignments")
            .insert(payload);

          if (error) throw error;
        }
      } else {
        const payload = {
          institution_id: institutionId,
          staff_id: form.staff_id,
          department_id: form.department_id || null,
          programme_id: form.programme_id || null,
          academic_unit_id: form.academic_unit_id,
          subject_assignment_id: null,
          class_id: form.class_id || null,
          academic_year: form.academic_year,
          term: form.term,
        };

        if (editingGroup) {
          const { error } = await supabase
            .from("staff_teaching_assignments")
            .update(payload)
            .eq("id", editingGroup.assignments[0].id)
            .eq("institution_id", institutionId);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("staff_teaching_assignments")
            .insert([payload]);

          if (error) throw error;
        }
      }

      setMessage(
        editingGroup
          ? "Teaching assignments updated successfully."
          : "Teaching assignments created successfully."
      );

      resetForm();
      await loadAssignments(institutionId);
    } catch (error) {
      setMessage(
        error.code === "23505"
          ? "One or more of these teaching assignments already exist."
          : error.message
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(group) {
    const first = group.assignments[0];

    setEditingGroup(group);

    setForm({
      staff_id: first.staff_id || "",
      department_id: first.department_id || "",
      programme_id: first.programme_id || "",
      academic_unit_id: first.academic_unit_id || "",
      class_id: first.class_id || "",
      academic_year: first.academic_year || "",
      term: first.term || "",
    });

    setSelectedSubjectAssignments(
      isSchool
        ? group.assignments
            .map((item) => item.subject_assignment_id)
            .filter(Boolean)
        : []
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleAssignmentGroup(group) {
    const hasActive = group.assignments.some(
      (item) => item.is_active
    );

    const newStatus = !hasActive;

    const confirmed = window.confirm(
      newStatus
        ? "Activate all assignments in this group?"
        : "Deactivate all assignments in this group?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("staff_teaching_assignments")
      .update({ is_active: newStatus })
      .in(
        "id",
        group.assignments.map((item) => item.id)
      )
      .eq("institution_id", institutionId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      newStatus
        ? "All assignments in this group have been activated."
        : "All assignments in this group have been deactivated."
    );

    await loadAssignments(institutionId);
  }

  async function deleteAssignmentGroup(group) {
    const confirmed = window.confirm(
      `Permanently delete all ${group.assignments.length} assignment(s) for ${group.staffName}?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("staff_teaching_assignments")
      .delete()
      .in(
        "id",
        group.assignments.map((item) => item.id)
      )
      .eq("institution_id", institutionId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Teaching assignments deleted successfully.");

    if (editingGroup?.key === group.key) {
      resetForm();
    }

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

  const groupedAssignments = (() => {
    const groups = new Map();

    assignments.forEach((assignment) => {
      const key = [
        assignment.staff_id,
        assignment.department_id || "",
        assignment.academic_year || "",
        assignment.term || "",
      ].join("|");

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          staffName: assignment.staff?.full_name || "Unknown staff",
          staffNumber: assignment.staff?.staff_number || "",
          department: assignment.department?.name || "—",
          academicYear: assignment.academic_year || "—",
          term: assignment.term || "—",
          assignments: [],
        });
      }

      groups.get(key).assignments.push(assignment);
    });

    return Array.from(groups.values());
  })();

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
          {isSchool
            ? "Assign teachers to subjects and classes."
            : "Assign staff members to academic units, programmes and classes."}
        </p>
      </div>

      {message && (
        <div className="teaching-assignment-message">
          {message}
        </div>
      )}

      <div className="teaching-assignment-form-card">
        <h2>
          {editingGroup ? "Edit Teaching Assignments" : "Assign Staff"}
        </h2>

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

            {isSchool ? (
              <>
                {institutionType === "secondary" && (
                  <div>
                    <label>Department (Optional)</label>
                    <select
                      name="department_id"
                      value={form.department_id}
                      onChange={handleChange}
                    >
                      <option value="">Select department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ gridColumn: "1 / -1", minWidth: 0 }}>
                  <label>Subjects and Classes — select one or more</label>

                  <div
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      padding: "8px",
                      maxHeight: "260px",
                      overflowY: "auto",
                      width: "100%",
                      boxSizing: "border-box",
                      textAlign: "left",
                    }}
                  >
                    {subjects.length === 0 ? (
                      <p>
                        No active subject assignments found. Register
                        subjects and assign them to classes first.
                      </p>
                    ) : (
                      subjects.map((item) => (
                        <label
                          key={item.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "20px minmax(0, 1fr)",
                            alignItems: "center",
                            justifyContent: "start",
                            columnGap: "10px",
                            padding: "10px 4px",
                            margin: "0",
                            borderBottom: "1px solid #eee",cursor: "pointer",
                    fontWeight: "normal",
                    textAlign: "left",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSubjectAssignments.includes(item.id)}
                    onChange={() => toggleSubjectAssignment(item.id)}
                    style={{
                      width: "16px",
                      height: "16px",
                      margin: "0",
                      justifySelf: "start",
                      alignSelf: "center",
                      cursor: "pointer",
                    }}
                  />

                  <span>
                    <strong>{item.subjects?.name || "Unnamed subject"}</strong>
                    {item.subjects?.code
                      ? ` (${item.subjects.code})`
                      : ""}
                    {" — "}
                    {item.classes?.name || "Unnamed class"}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      </>
    ) : (
      <>
        <div>
          <label>Department</label>
          <select
            name="department_id"
            value={form.department_id}
            onChange={handleChange}
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Programme</label>
          <select
            name="programme_id"
            value={form.programme_id}
            onChange={handleChange}
          >
            <option value="">Select programme</option>
            {filteredProgrammes.map((programme) => (
              <option key={programme.id} value={programme.id}>
                {programme.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Academic Unit</label>
          <select
            name="academic_unit_id"
            value={form.academic_unit_id}
            onChange={handleChange}
            required
          >
            <option value="">Select academic unit</option>
            {filteredAcademicUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} {unit.code ? `(${unit.code})` : ""}
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
              </option>
            ))}
          </select>
        </div>
      </>
    )}

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
      <label>{academicPeriodLabel}</label>
      <select
        name="term"
        value={form.term}
        onChange={handleChange}
        required
      >
        <option value="">
          Select {academicPeriodLabel.toLowerCase()}
        </option>
        {isSchool ? (
          <>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </>
        ) : (
          <>
            <option value="Semester 1">Semester 1</option>
            <option value="Semester 2">Semester 2</option>
            <option value="Semester 3">Semester 3</option>
          </>
        )}
      </select>
    </div>
  </div>

  <div className="teaching-assignment-form-actions">
    <button type="submit" disabled={saving}>
      {saving
        ? "Saving..."
        : editingGroup
          ? "Update Assignments"
          : "Save Assignments"}
    </button>

    {editingGroup && (
      <button
        type="button"
        onClick={resetForm}
        disabled={saving}
      >
        Cancel
      </button>
    )}
  </div>
</form>

  </div>  <div className="teaching-assignment-table-card">
    <h2>Assigned Staff</h2>

    {groupedAssignments.length === 0 ? (
      <p>No teaching assignments have been created yet.</p>
    ) : (
      <div className="teaching-assignment-table-wrapper">
        <table className="teaching-assignment-table">
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Department</th>
              <th>
                {isSchool ? "Subjects and Classes" : "Academic Unit"}
              </th>
              <th>Academic Year</th>
              <th>{academicPeriodLabel}</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {groupedAssignments.map((group) => {
              const groupIsActive = group.assignments.every(
                (item) => item.is_active
              );

              return (
                <tr key={group.key}>
                  <td>
                    <strong>{group.staffName}</strong>
                    {group.staffNumber && (
                      <div>{group.staffNumber}</div>
                    )}
                  </td>

                  <td>{group.department}</td>

                  <td>
                    {isSchool ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        {group.assignments.map((assignment) => (
                          <div key={assignment.id}>
                            <strong>
                              {assignment.subject_assignment?.subjects?.name ||
                                "Subject unavailable"}
                            </strong>
                            {" — "}
                            {assignment.subject_assignment?.classes?.name ||
                              assignment.class?.name ||
                              "Class unavailable"}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        {group.assignments.map((assignment) => (
                          <div key={assignment.id}>
                            {assignment.academic_unit?.name ||
                              "Academic unit unavailable"}
                            {assignment.academic_unit?.code
                              ? ` (${assignment.academic_unit.code})`
                              : ""}
                            {assignment.class?.name
                              ? ` — ${assignment.class.name}`
                              : ""}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  <td>{group.academicYear}</td>
                  <td>{group.term}</td>

                  <td>
                    <span
                      className={
                        groupIsActive
                          ? "assignment-status active"
                          : "assignment-status inactive"
                      }
                    >
                      {groupIsActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td>
                    <div className="teaching-assignment-actions">
                      <button
                        type="button"
                        onClick={() => handleEdit(group)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleAssignmentGroup(group)}
                      >
                        {groupIsActive ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteAssignmentGroup(group)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
</div>
);
}

export default TeachingAssignments;