import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

function Staff() {
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [institutionId, setInstitutionId] = useState(null);

  const [fullName, setFullName] = useState("");
  const [staffNumber, setStaffNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [staffRole, setStaffRole] = useState("teacher");

  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountLoadingId, setAccountLoadingId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadStaffData();
  }, []);

  async function loadStaffData() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
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
        .maybeSingle();

      if (membershipError) {
        throw membershipError;
      }

      if (!membership) {
        setMessage("Institution administrator membership not found.");
        setLoading(false);
        return;
      }

      setInstitutionId(membership.institution_id);

      const { data: departmentData, error: departmentError } =
        await supabase
          .from("departments")
          .select("id, name, code")
          .eq("institution_id", membership.institution_id)
          .order("name", { ascending: true });

      if (departmentError) {
        throw departmentError;
      }

      setDepartments(departmentData || []);

      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select(`
          id,
          institution_id,
          department_id,
          staff_number,
          full_name,
          email,
          phone,
          staff_role,
          is_active,
          account_status,
          invited_at,
          account_created_at,
          last_login_at,
          user_id,
          created_at,
          departments (
            id,
            name,
            code
          )
        `)
        .eq("institution_id", membership.institution_id)
        .order("created_at", { ascending: false });

      if (staffError) {
        throw staffError;
      }

      setStaff(staffData || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFullName("");
    setStaffNumber("");
    setEmail("");
    setPhone("");
    setDepartmentId("");
    setStaffRole("teacher");
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!institutionId) {
      setMessage("Institution information is not available.");
      return;
    }

    if (!fullName.trim()) {
      setMessage("Please enter the staff member's full name.");
      return;
    }

    if (!staffRole) {
      setMessage("Please select a staff role.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const staffData = {
        institution_id: institutionId,
        full_name: fullName.trim(),
        staff_number: staffNumber.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        department_id: departmentId || null,
        staff_role: staffRole,
      };

      if (editingId) {
        const { error } = await supabase
          .from("staff")
          .update(staffData)
          .eq("id", editingId)
          .eq("institution_id", institutionId);

        if (error) {
          throw error;
        }

        setMessage("Staff member updated successfully.");
      } else {
        const { error } = await supabase
          .from("staff")
          .insert([staffData]);

        if (error) {
          throw error;
        }

        setMessage("Staff member added successfully.");
      }

      resetForm();
      await loadStaffData();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(member) {
    setEditingId(member.id);
    setFullName(member.full_name || "");
    setStaffNumber(member.staff_number || "");
    setEmail(member.email || "");
    setPhone(member.phone || "");
    setDepartmentId(member.department_id || "");
    setStaffRole(member.staff_role || "teacher");

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this staff member?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");

    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", id)
        .eq("institution_id", institutionId);

      if (error) {
        throw error;
      }

      setMessage("Staff member deleted successfully.");

      if (editingId === id) {
        resetForm();
      }

      await loadStaffData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleAccountAction(member) {
    if (!member.email) {
      setMessage(
        "Please add an email address to this staff member before creating an account."
      );
      return;
    }

    if (member.user_id) {
  setMessage(
        `${member.full_name} already has an account.`
  );
  return;
}

    const confirmed = window.confirm(
      `Create a staff account for ${member.full_name} and send an invitation to ${member.email}?`
    );

    if (!confirmed) {
      return;
    }

    setAccountLoadingId(member.id);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const { data, error } = await supabase.functions.invoke(
        "invite-staff",
        {
          body: {
            staff_id: member.id,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setMessage(
        data?.message ||
          `Invitation sent to ${member.email}.`
      );

      await loadStaffData();
    } catch (error) {
      console.error("Staff account invitation error:", error);

      setMessage(
        error.message ||
          "Unable to create the staff account."
      );
    } finally {
      setAccountLoadingId(null);
    }
  }

  function formatRole(role) {
    if (role === "head_of_department") {
      return "Head of Department";
    }

    if (role === "teacher") {
      return "Teacher";
    }

    if (role === "lecturer") {
      return "Lecturer";
    }

    if (role === "staff") {
      return "Staff";
    }

    return role;
  }

  function formatAccountStatus(status) {
    if (status === "active") {
      return "Active";
    }

    if (status === "suspended") {
      return "Suspended";
    }

    return "Pending";
  }

  function getAccountStatusClass(status) {
    if (status === "active") {
      return "staff-account-status-active";
    }

    if (status === "suspended") {
      return "staff-account-status-suspended";
    }

    return "staff-account-status-pending";
  }

  if (loading) {
    return (
      <div className="staff-loading">
        Loading staff...
      </div>
    );
  }

  return (
    <div className="staff-page">

      <div className="staff-page-header">
        <div>
          <h1>Staff Management</h1>
          <p>
            Add and manage teachers, lecturers, heads of department and other
            staff members.
          </p>
        </div>
      </div>

      {message && (
        <div className="staff-message">
          {message}
        </div>
      )}

      <div className="staff-form-card">
        <h2>
          {editingId ? "Edit Staff Member" : "Add Staff Member"}
        </h2>

        <form onSubmit={handleSubmit}>

          <div className="staff-form-grid">

            <div>
              <label>Full Name</label>

              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter full name"
              />
            </div>

            <div>
              <label>Staff Number</label>

              <input
                type="text"
                value={staffNumber}
                onChange={(event) => setStaffNumber(event.target.value)}
                placeholder="e.g. STF001"
              />
            </div>

            <div>
              <label>Email</label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="staff@example.com"
              />
            </div>

            <div>
              <label>Phone</label>

              <input
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number"
              />
            </div>

            <div>
              <label>Department</label>

              <select
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
              >
                <option value="">Select Department</option>

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

            <div>
              <label>Staff Role</label>

              <select
                value={staffRole}
                onChange={(event) => setStaffRole(event.target.value)}
              >
                <option value="teacher">Teacher</option>

                <option value="lecturer">
                  Lecturer
                </option>

                <option value="head_of_department">
                  Head of Department
                </option>

                <option value="staff">
                  Staff
                </option>
              </select>
            </div>

          </div>

          <div className="staff-form-actions">

            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                ? "Update Staff"
                : "Add Staff"}
            </button>

            {editingId && (
              <button
                type="button"
                className="staff-cancel-button"
                onClick={() => {
                  resetForm();
                  setMessage("");
                }}
              >
                Cancel
              </button>
            )}

          </div>

        </form>
      </div>

      <div className="staff-table-card">

        <div className="staff-table-header">
          <div>
            <h2>Staff Members</h2>

            <p>
              {staff.length} staff member
              {staff.length === 1 ? "" : "s"} registered
            </p>
          </div>
        </div>

        {staff.length === 0 ? (
          <div className="staff-empty">
            <h3>No Staff Members Yet</h3>

            <p>
              Add your first staff member using the form above.
            </p>
          </div>
        ) : (
          <div className="staff-table-wrapper">

            <table className="staff-table">

              <thead>
                <tr>
                  <th>#</th>
                  <th>Staff Number</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Staff Status</th>
                  <th>Account</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {staff.map((member, index) => (

                  <tr key={member.id}>

                    <td>
                      {index + 1}
                    </td>

                    <td>
                      {member.staff_number || "—"}
                    </td>

                    <td>
                      <strong>
                        {member.full_name}
                      </strong>
                    </td>

                    <td>
                      {member.email || "—"}
                    </td>

                    <td>
                      {member.phone || "—"}
                    </td>

                    <td>
                      {member.departments
                        ? member.departments.name
                        : "—"}
                    </td>

                    <td>
                      {formatRole(member.staff_role)}
                    </td>

                    <td>
                      <span
                        className={
                          member.is_active
                            ? "staff-status-active"
                            : "staff-status-inactive"
                        }
                      >
                        {member.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td>

                      <div className="staff-account-cell">

                        <span
                          className={getAccountStatusClass(
                            member.account_status
                          )}
                        >
                          {formatAccountStatus(
                            member.account_status
                          )}
                        </span>

                        {member.user_id ? (
                          <small className="staff-account-created">
                            Account created
                          </small>
                        ) : (
                          <small className="staff-account-not-created">
                            No account
                          </small>
                        )}

                      </div>

                    </td>

                    <td>

                      <div className="staff-actions">

                        <button
                          type="button"
                          className="staff-edit-button"
                          onClick={() =>
                            handleEdit(member)
                          }
                        >
                          Edit
                        </button>

                        {!member.user_id && (
  <button
    type="button"
    className="staff-account-button"
    disabled={accountLoadingId === member.id}
    onClick={() => handleAccountAction(member)}
  >
    {accountLoadingId === member.id
      ? "Sending Invite..."
      : "Send Invite"}
  </button>
)}

                        {member.user_id && (
                          <button
                            type="button"
                            className="staff-account-button"
                            onClick={() =>
                              handleAccountAction(member)
                            }
                          >
                            Manage Account
                          </button>
                        )}

                        <button
                          type="button"
                          className="staff-delete-button"
                          onClick={() =>
                            handleDelete(member.id)
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

export default Staff;