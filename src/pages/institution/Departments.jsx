import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

function Departments() {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [institutionId, setInstitutionId] = useState(null);

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
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

      const { data, error } = await supabase
        .from("departments")
        .select("id, name, code, created_at")
        .eq("institution_id", membership.institution_id)
        .order("name", { ascending: true });

      if (error) throw error;

      setDepartments(data || []);
    } catch (error) {
      setMessage(error.message || "Unable to load departments.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();

    if (!institutionId) {
      setMessage("Institution information is not available.");
      setMessageType("error");
      return;
    }

    if (!departmentName.trim() || !departmentCode.trim()) {
      setMessage("Please enter both department name and code.");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("");

    const departmentData = {
      name: departmentName.trim(),
      code: departmentCode.trim().toUpperCase(),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("departments")
          .update(departmentData)
          .eq("id", editingId)
          .eq("institution_id", institutionId);

        if (error) throw error;

        setMessage("Department updated successfully.");
      } else {
        const { error } = await supabase
          .from("departments")
          .insert({
            institution_id: institutionId,
            ...departmentData,
          });

        if (error) throw error;

        setMessage("Department added successfully.");
      }

      setMessageType("success");
      resetForm();

      await loadDepartments();
    } catch (error) {
      if (error.code === "23505") {
        setMessage(
          "A department with this name or code already exists."
        );
      } else {
        setMessage(error.message || "Unable to save department.");
      }

      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (department) => {
    setEditingId(department.id);
    setDepartmentName(department.name);
    setDepartmentCode(department.code);
    setMessage("");
    setMessageType("info");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setDepartmentName("");
    setDepartmentCode("");
  };

  const handleCancelEdit = () => {
    resetForm();
    setMessage("");
    setMessageType("info");
  };

  const handleManageProgrammes = (department) => {
    navigate(
      `/dashboard/programmes?departmentId=${encodeURIComponent(
        department.id
      )}`
    );
  };

  const handleDelete = async (department) => {
    if (!institutionId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${department.name}"?`
    );

    if (!confirmed) return;

    setMessage("");

    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", department.id)
        .eq("institution_id", institutionId);

      if (error) throw error;

      if (editingId === department.id) {
        resetForm();
      }

      setMessage("Department deleted successfully.");
      setMessageType("success");

      await loadDepartments();
    } catch (error) {
      setMessage(
        error.message ||
          "Unable to delete this department. Check whether programmes, classes, or academic units depend on it."
      );
      setMessageType("error");
    }
  };

  return (
    <div className="department-page">
      <div className="department-header">
        <div>
          <h1>Departments</h1>

          <p>
            Create departments and manage their academic programmes.
          </p>
        </div>

        <div className="department-count">
          <strong>{departments.length}</strong>
          <span>Departments</span>
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

      {/* ADD / EDIT DEPARTMENT */}
      <section className="department-card">
        <h2>{editingId ? "Edit Department" : "Add Department"}</h2>

        <p>
          {editingId
            ? "Update the department information below."
            : "Create a department for your institution."}
        </p>

        <form className="department-form" onSubmit={handleSaveDepartment}>
          <div>
            <label htmlFor="department-name">Department Name</label>

            <input
              id="department-name"
              type="text"
              placeholder="e.g. Computer Science"
              value={departmentName}
              onChange={(e) => setDepartmentName(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="department-code">Department Code</label>

            <input
              id="department-code"
              type="text"
              placeholder="e.g. CS"
              value={departmentCode}
              onChange={(e) => setDepartmentCode(e.target.value)}
              required
            />
          </div>

          <div className="department-form-actions">
            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                ? "Save Changes"
                : "+ Add Department"}
            </button>

            {editingId && (
              <button
                type="button"
                className="department-cancel-button"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* DEPARTMENT LIST */}
      <section className="department-card">
        <div className="department-list-header">
          <div>
            <h2>Institution Departments</h2>

            <p>
              Select a department to manage its programmes.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="department-empty">
            <p>Loading departments...</p>
          </div>
        ) : departments.length === 0 ? (
          <div className="department-empty">
            <h3>No departments yet</h3>

            <p>
              Add your first department using the form above.
            </p>
          </div>
        ) : (
          <div className="department-table-wrapper">
            <table className="department-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Department Name</th>
                  <th>Code</th>
                  <th>Date Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {departments.map((department, index) => (
                  <tr key={department.id}>
                    <td>{index + 1}</td>

                    <td>
                      <strong>{department.name}</strong>
                    </td>

                    <td>
                      <span className="department-code">
                        {department.code}
                      </span>
                    </td>

                    <td>
                      {department.created_at
                        ? new Date(
                            department.created_at
                          ).toLocaleDateString()
                        : "—"}
                    </td>

                    <td>
                      <div className="department-actions">
                        <button
                          type="button"
                          className="department-edit-button"
                          onClick={() => handleEdit(department)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleManageProgrammes(department)
                          }
                          style={{
                            background: "#064789",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "8px 12px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Manage Programmes
                        </button>

                        <button
                          type="button"
                          className="department-delete-button"
                          onClick={() => handleDelete(department)}
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
      </section>
    </div>
  );
}

export default Departments;