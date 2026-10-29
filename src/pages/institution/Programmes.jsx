import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../services/supabase";

function Programmes() {
  const [searchParams] = useSearchParams();

  const [programmes, setProgrammes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [institutionId, setInstitutionId] = useState(null);

  const [departmentId, setDepartmentId] = useState(
    searchParams.get("departmentId") || ""
  );

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [programmesLoading, setProgrammesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  useEffect(() => {
    initializePage();
  }, []);

  // Load the logged-in administrator's institution and departments.
  const initializePage = async () => {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setMessage("You are not logged in.");
        setMessageType("error");
        return;
      }

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
        setMessage("No institution was found for this account.");
        setMessageType("error");
        return;
      }

      setInstitutionId(membership.institution_id);

      const { data: departmentData, error: departmentError } =
        await supabase
          .from("departments")
          .select("id, name, code")
          .eq("institution_id", membership.institution_id)
          .order("name", { ascending: true });

      if (departmentError) throw departmentError;

      const availableDepartments = departmentData || [];
      setDepartments(availableDepartments);

      // Keep the department passed in the URL only if it belongs
      // to the administrator's institution.
      const requestedDepartmentId =
        searchParams.get("departmentId") || "";

      const requestedDepartmentExists = availableDepartments.some(
        (department) => department.id === requestedDepartmentId
      );

      if (requestedDepartmentExists) {
        setDepartmentId(requestedDepartmentId);
        await loadProgrammes(
          membership.institution_id,
          requestedDepartmentId
        );
      } else {
        setDepartmentId("");
        setProgrammes([]);
      }
    } catch (error) {
      setMessage(error.message || "Unable to load programme data.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // Load programmes for the selected department only.
  const loadProgrammes = async (currentInstitutionId, selectedDepartmentId) => {
    if (!currentInstitutionId || !selectedDepartmentId) {
      setProgrammes([]);
      return;
    }

    setProgrammesLoading(true);

    try {
      const { data, error } = await supabase
        .from("programmes")
        .select(`
          id,
          name,
          code,
          department_id,
          departments (
            id,
            name,
            code
          )
        `)
        .eq("institution_id", currentInstitutionId)
        .eq("department_id", selectedDepartmentId)
        .order("name", { ascending: true });

      if (error) throw error;

      setProgrammes(data || []);
    } catch (error) {
      setMessage(error.message || "Unable to load programmes.");
      setMessageType("error");
      setProgrammes([]);
    } finally {
      setProgrammesLoading(false);
    }
  };

  const handleDepartmentChange = async (e) => {
    const selectedId = e.target.value;

    setDepartmentId(selectedId);
    setProgrammes([]);
    setMessage("");
    setMessageType("info");

    // Clear the form when switching departments.
    resetForm();

    if (selectedId) {
      await loadProgrammes(institutionId, selectedId);
    }
  };

  const handleSaveProgramme = async (e) => {
    e.preventDefault();

    if (!institutionId) {
      setMessage("Institution information is missing.");
      setMessageType("error");
      return;
    }

    if (!departmentId) {
      setMessage("Please select a department first.");
      setMessageType("error");
      return;
    }

    if (!name.trim() || !code.trim()) {
      setMessage("Please enter both the programme name and code.");
      setMessageType("error");
      return;
    }

    // Verify that the selected department belongs to this institution.
    const departmentExists = departments.some(
      (department) => department.id === departmentId
    );

    if (!departmentExists) {
      setMessage("Please select a valid department.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("");

    const programmeData = {
      institution_id: institutionId,
      department_id: departmentId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("programmes")
          .update(programmeData)
          .eq("id", editingId)
          .eq("institution_id", institutionId)
          .eq("department_id", departmentId);

        if (error) throw error;

        setMessage("Programme updated successfully.");
      } else {
        const { error } = await supabase
          .from("programmes")
          .insert([programmeData]);

        if (error) throw error;

        setMessage("Programme added successfully.");
      }

      setMessageType("success");
      resetForm();

      await loadProgrammes(institutionId, departmentId);
    } catch (error) {
      if (error.code === "23505") {
        setMessage(
          "A programme with this name or code already exists."
        );
      } else {
        setMessage(error.message || "Unable to save the programme.");
      }

      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (programme) => {
    setEditingId(programme.id);
    setName(programme.name);
    setCode(programme.code);
    setMessage("");
    setMessageType("info");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCancelEdit = () => {
    resetForm();
    setMessage("");
    setMessageType("info");
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCode("");
  };

  const handleDelete = async (programme) => {
    if (!institutionId || !departmentId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${programme.name}"?`
    );

    if (!confirmed) return;

    setMessage("");
    setMessageType("info");

    try {
      const { error } = await supabase
        .from("programmes")
        .delete()
        .eq("id", programme.id)
        .eq("institution_id", institutionId)
        .eq("department_id", departmentId);

      if (error) throw error;

      if (editingId === programme.id) {
        resetForm();
      }

      setMessage("Programme deleted successfully.");
      setMessageType("success");

      await loadProgrammes(institutionId, departmentId);
    } catch (error) {
      setMessage(
        error.message ||
          "Unable to delete this programme. Check whether academic units or classes depend on it."
      );
      setMessageType("error");
    }
  };

  const selectedDepartment = departments.find(
    (department) => department.id === departmentId
  );

  if (loading) {
    return (
      <div className="programme-page">
        <div className="programme-loading">
          <h2>Loading departments...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="programme-page">
      <div className="programme-page-header">
        <div>
          <h1>Programmes</h1>
          <p>
            Select a department to manage its academic programmes.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`dashboard-message ${
            messageType === "error"
              ? "error"
              : messageType === "success"
              ? "success"
              : ""
          }`}
          role="status"
        >
          {message}
        </div>
      )}

      {/* DEPARTMENT SELECTION */}
      <div className="programme-form-card">
        <h2>Select Department</h2>

        <div className="programme-form-grid">
          <div>
            <label htmlFor="programme-department">
              Department *
            </label>

            <select
              id="programme-department"
              value={departmentId}
              onChange={handleDepartmentChange}
              required
            >
              <option value="">
                -- Select a department --
              </option>

              {departments.map((department) => (
                <option
                  key={department.id}
                  value={department.id}
                >
                  {department.name}
                  {department.code
                    ? ` (${department.code})`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {departments.length === 0 && (
          <p>
            No departments have been created yet. Create a department
            before adding programmes.
          </p>
        )}

        {selectedDepartment && (
          <p>
            Managing programmes for:{" "}
            <strong>{selectedDepartment.name}</strong>
          </p>
        )}
      </div>

      {/* ADD / EDIT PROGRAMME */}
      {departmentId && (
        <div className="programme-form-card">
          <h2>
            {editingId ? "Edit Programme" : "Add Programme"}
          </h2>

          <p>
            {editingId
              ? "Update the programme details below."
              : `Add a programme under ${selectedDepartment?.name}.`}
          </p>

          <form onSubmit={handleSaveProgramme}>
            <div className="programme-form-grid">
              <div>
                <label htmlFor="programme-name">
                  Programme Name *
                </label>

                <input
                  id="programme-name"
                  type="text"
                  placeholder="e.g. BSc Software Engineering"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="programme-code">
                  Programme Code *
                </label>

                <input
                  id="programme-code"
                  type="text"
                  placeholder="e.g. BSE"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="programme-form-actions">
              <button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Programme"
                  : "+ Add Programme"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="programme-cancel-button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* PROGRAMME LIST */}
      <div className="programme-table-card">
        <div className="programme-table-header">
          <div>
            <h2>Programme List</h2>

            <p>
              {!departmentId
                ? "Select a department to view its programmes."
                : `${programmes.length} programme${
                    programmes.length === 1 ? "" : "s"
                  }`}
            </p>
          </div>
        </div>

        {!departmentId ? (
          <div className="programme-empty">
            <h3>Select a department</h3>
            <p>
              The programme list will appear after you select a
              department above.
            </p>
          </div>
        ) : programmesLoading ? (
          <div className="programme-empty">
            <p>Loading programmes...</p>
          </div>
        ) : programmes.length === 0 ? (
          <div className="programme-empty">
            <h3>No programmes yet</h3>
            <p>
              Add the first programme for this department using the
              form above.
            </p>
          </div>
        ) : (
          <div className="programme-table-wrapper">
            <table className="programme-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Programme</th>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {programmes.map((programme, index) => (
                  <tr key={programme.id}>
                    <td>{index + 1}</td>

                    <td>
                      <strong>{programme.name}</strong>
                    </td>

                    <td>{programme.code}</td>

                    <td>
                      {programme.departments?.name ||
                        selectedDepartment?.name ||
                        "Not assigned"}
                    </td>

                    <td>
                      <div className="programme-actions">
                        <button
                          type="button"
                          className="programme-edit-button"
                          onClick={() => handleEdit(programme)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="programme-delete-button"
                          onClick={() => handleDelete(programme)}
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

export default Programmes;