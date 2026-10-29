import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import "./Users.css";

function Users() {
  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [institutionFilter, setInstitutionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setMessage("");

    try {
      /*
       * ------------------------------------------------------
       * 1. LOAD INSTITUTIONS
       * ------------------------------------------------------
       */

      const {
        data: institutionData,
        error: institutionError,
      } = await supabase
        .from("institutions")
        .select(`
          id,
          name,
          institution_type,
          email,
          phone,
          is_active
        `)
        .order("name", { ascending: true });

      if (institutionError) {
        throw institutionError;
      }

      setInstitutions(institutionData || []);


      /*
       * ------------------------------------------------------
       * 2. LOAD SUPER ADMINS
       * ------------------------------------------------------
       */

      const {
        data: superAdmins,
        error: superAdminError,
      } = await supabase
        .from("super_admins")
        .select(`
          id,
          user_id,
          full_name,
          email,
          is_active,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        });

      if (superAdminError) {
        throw superAdminError;
      }


      /*
       * ------------------------------------------------------
       * 3. LOAD INSTITUTION MEMBERS
       * ------------------------------------------------------
       */

      const {
        data: members,
        error: membersError,
      } = await supabase
        .from("institution_members")
        .select(`
          user_id,
          institution_id,
          role,
          is_active,
          institutions (
            id,
            name,
            institution_type
          )
        `);

      if (membersError) {
        throw membersError;
      }


      /*
       * ------------------------------------------------------
       * 4. LOAD STAFF
       * ------------------------------------------------------
       */

      const {
        data: staff,
        error: staffError,
      } = await supabase
        .from("staff")
        .select(`
          id,
          user_id,
          institution_id,
          staff_number,
          full_name,
          email,
          phone,
          is_active,
          created_at
        `);

      if (staffError) {
        throw staffError;
      }


      /*
       * ------------------------------------------------------
       * 5. LOAD STUDENTS
       * ------------------------------------------------------
       */

      const {
        data: students,
        error: studentsError,
      } = await supabase
        .from("students")
        .select(`
          id,
          user_id,
          institution_id,
          admission_number,
          first_name,
          middle_name,
          last_name,
          email,
          phone,
          status,
          created_at
        `);

      if (studentsError) {
        throw studentsError;
      }


      /*
       * ------------------------------------------------------
       * 6. BUILD PLATFORM USER LIST
       * ------------------------------------------------------
       */

      const combinedUsers = [];

      /*
       * SUPER ADMINS
       */

      (superAdmins || []).forEach((admin) => {
        combinedUsers.push({
          id: `super-${admin.id}`,
          user_id: admin.user_id,
          name: admin.full_name || "Super Admin",
          email: admin.email || "—",
          phone: "—",
          role: "super_admin",
          roleLabel: "Super Admin",
          institutionId: null,
          institutionName: "EMP Platform",
          institutionType: "Platform",
          isActive: admin.is_active,
          source: "super_admins",
          createdAt: admin.created_at,
        });
      });


      /*
       * INSTITUTION MEMBERS
       */

      (members || []).forEach((member) => {
        /*
         * Super admins are already represented above.
         */
        if (member.role === "super_admin") {
          return;
        }

        const institution = member.institutions;

        combinedUsers.push({
          id: `member-${member.user_id}-${member.institution_id}`,
          user_id: member.user_id,
          name:
            member.role === "institution_admin"
              ? "Institution Administrator"
              : "Institution User",
          email: "—",
          phone: "—",
          role: member.role || "member",
          roleLabel: formatRole(member.role),
          institutionId: member.institution_id,
          institutionName:
            institution?.name || "Unknown Institution",
          institutionType:
            institution?.institution_type || "—",
          isActive: member.is_active,
          source: "institution_members",
          createdAt: null,
        });
      });


      /*
       * STAFF
       */

      (staff || []).forEach((person) => {
        const institution = (institutionData || []).find(
          (item) => item.id === person.institution_id
        );

        combinedUsers.push({
          id: `staff-${person.id}`,
          user_id: person.user_id,
          name: person.full_name || "Unnamed Staff",
          email: person.email || "—",
          phone: person.phone || "—",
          role: "staff",
          roleLabel: "Staff",
          institutionId: person.institution_id,
          institutionName:
            institution?.name || "Unknown Institution",
          institutionType:
            institution?.institution_type || "—",
          identifier:
            person.staff_number || "—",
          isActive: person.is_active !== false,
          source: "staff",
          createdAt: person.created_at,
        });
      });


      /*
       * STUDENTS
       */

      (students || []).forEach((student) => {
        const institution = (institutionData || []).find(
          (item) => item.id === student.institution_id
        );

        const fullName = [
          student.first_name,
          student.middle_name,
          student.last_name,
        ]
          .filter(Boolean)
          .join(" ");

        combinedUsers.push({
          id: `student-${student.id}`,
          user_id: student.user_id,
          name: fullName || "Unnamed Student",
          email: student.email || "—",
          phone: student.phone || "—",
          role: "student",
          roleLabel: "Student",
          institutionId: student.institution_id,
          institutionName:
            institution?.name || "Unknown Institution",
          institutionType:
            institution?.institution_type || "—",
          identifier:
            student.admission_number || "—",
          isActive:
            student.status !== "inactive" &&
            student.status !== "withdrawn",
          studentStatus: student.status || "—",
          source: "students",
          createdAt: student.created_at,
        });
      });


      /*
       * Remove duplicate institution membership records
       * for the same user and institution.
       */

      const uniqueUsers = [];

      const seen = new Set();

      combinedUsers.forEach((user) => {
        const key =
          user.role === "super_admin"
            ? `super-${user.user_id}`
            : `${user.user_id}-${user.institutionId}-${user.role}`;

        if (!seen.has(key)) {
          seen.add(key);
          uniqueUsers.push(user);
        }
      });

      setUsers(uniqueUsers);
    } catch (error) {
      console.error(
        "Super Admin Users loading error:",
        error
      );

      setMessage(
        error.message ||
          "Failed to load platform users."
      );
    } finally {
      setLoading(false);
    }
  };


  /*
   * --------------------------------------------------------
   * FORMAT ROLE
   * --------------------------------------------------------
   */

  const formatRole = (role) => {
    if (!role) return "User";

    return role
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };


  /*
   * --------------------------------------------------------
   * FILTER USERS
   * --------------------------------------------------------
   */

  const filteredUsers = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !searchValue ||
        user.name
          ?.toLowerCase()
          .includes(searchValue) ||
        user.email
          ?.toLowerCase()
          .includes(searchValue) ||
        user.phone
          ?.toLowerCase()
          .includes(searchValue) ||
        user.institutionName
          ?.toLowerCase()
          .includes(searchValue) ||
        user.identifier
          ?.toLowerCase()
          .includes(searchValue);

      const matchesRole =
        roleFilter === "all" ||
        user.role === roleFilter;

      const matchesInstitution =
        institutionFilter === "all" ||
        user.institutionId === institutionFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          user.isActive) ||
        (statusFilter === "inactive" &&
          !user.isActive);

      return (
        matchesSearch &&
        matchesRole &&
        matchesInstitution &&
        matchesStatus
      );
    });
  }, [
    users,
    search,
    roleFilter,
    institutionFilter,
    statusFilter,
  ]);


  /*
   * --------------------------------------------------------
   * STATISTICS
   * --------------------------------------------------------
   */

  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) => user.isActive
  ).length;

  const inactiveUsers = users.filter(
    (user) => !user.isActive
  ).length;

  const adminUsers = users.filter(
    (user) =>
      user.role === "super_admin" ||
      user.role === "institution_admin"
  ).length;

  const staffUsers = users.filter(
    (user) => user.role === "staff"
  ).length;

  const studentUsers = users.filter(
    (user) => user.role === "student"
  ).length;


  /*
   * --------------------------------------------------------
   * ROLE BADGE
   * --------------------------------------------------------
   */

  const getRoleClass = (role) => {
    switch (role) {
      case "super_admin":
        return "role-super-admin";

      case "institution_admin":
        return "role-institution-admin";

      case "staff":
        return "role-staff";

      case "student":
        return "role-student";

      default:
        return "role-default";
    }
  };


  /*
   * --------------------------------------------------------
   * CLEAR FILTERS
   * --------------------------------------------------------
   */

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setInstitutionFilter("all");
    setStatusFilter("all");
  };


  /*
   * --------------------------------------------------------
   * LOADING
   * --------------------------------------------------------
 */

  if (loading) {
    return (
      <div className="superadmin-users-page">
        <div className="users-loading">
          <div className="loading-spinner"></div>

          <h2>Loading platform users...</h2>

          <p>
            Gathering users from across EMP.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="superadmin-users-page">

      {/* HEADER */}

      <div className="users-header">
        <div>
          <div className="users-breadcrumb">
            Super Admin / Users
          </div>

          <h1>Platform Users</h1>

          <p>
            Manage and monitor users across the
            entire EMP platform.
          </p>
        </div>

        <button
          className="users-refresh-button"
          onClick={loadUsers}
        >
          ↻ Refresh
        </button>
      </div>


      {/* MESSAGE */}

      {message && (
        <div className="users-message">
          <span>⚠️</span>

          <p>{message}</p>
        </div>
      )}


      {/* STATISTICS */}

      <section className="users-stats">

        <div className="users-stat-card">
          <div className="users-stat-icon">
            👥
          </div>

          <div>
            <span>Total Users</span>
            <strong>{totalUsers}</strong>
          </div>
        </div>


        <div className="users-stat-card">
          <div className="users-stat-icon">
            🟢
          </div>

          <div>
            <span>Active</span>
            <strong>{activeUsers}</strong>
          </div>
        </div>


        <div className="users-stat-card">
          <div className="users-stat-icon">
            🟠
          </div>

          <div>
            <span>Inactive</span>
            <strong>{inactiveUsers}</strong>
          </div>
        </div>


        <div className="users-stat-card">
          <div className="users-stat-icon">
            🛡️
          </div>

          <div>
            <span>Administrators</span>
            <strong>{adminUsers}</strong>
          </div>
        </div>


        <div className="users-stat-card">
          <div className="users-stat-icon">
            🧑‍🏫
          </div>

          <div>
            <span>Staff</span>
            <strong>{staffUsers}</strong>
          </div>
        </div>


        <div className="users-stat-card">
          <div className="users-stat-icon">
            🎓
          </div>

          <div>
            <span>Students</span>
            <strong>{studentUsers}</strong>
          </div>
        </div>

      </section>


      {/* FILTERS */}

      <section className="users-filters">

        <div className="users-search">
          <span>🔎</span>

          <input
            type="text"
            placeholder="Search users, email, institution..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>


        <select
          value={roleFilter}
          onChange={(e) =>
            setRoleFilter(e.target.value)
          }
        >
          <option value="all">
            All Roles
          </option>

          <option value="super_admin">
            Super Admin
          </option>

          <option value="institution_admin">
            Institution Admin
          </option>

          <option value="staff">
            Staff
          </option>

          <option value="student">
            Student
          </option>
        </select>


        <select
          value={institutionFilter}
          onChange={(e) =>
            setInstitutionFilter(e.target.value)
          }
        >
          <option value="all">
            All Institutions
          </option>

          {institutions.map((institution) => (
            <option
              key={institution.id}
              value={institution.id}
            >
              {institution.name}
            </option>
          ))}
        </select>


        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="all">
            All Status
          </option>

          <option value="active">
            Active
          </option>

          <option value="inactive">
            Inactive
          </option>
        </select>


        <button
          className="clear-filters-button"
          onClick={clearFilters}
        >
          Clear
        </button>

      </section>


      {/* RESULT COUNT */}

      <div className="users-result-info">
        <strong>
          {filteredUsers.length}
        </strong>

        <span>
          {filteredUsers.length === 1
            ? "user"
            : "users"}{" "}
          found
        </span>
      </div>


      {/* USERS TABLE */}

      <section className="users-table-card">

        {filteredUsers.length === 0 ? (
          <div className="users-empty">
            <div>👥</div>

            <h3>No users found</h3>

            <p>
              Try changing your search or filters.
            </p>

            <button
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="users-table-wrapper">

            <table className="users-table">

              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Institution</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {filteredUsers.map((user) => (
                  <tr key={user.id}>

                    <td>
                      <div className="user-cell">

                        <div className="user-avatar">
                          {getInitials(user.name)}
                        </div>

                        <div>
                          <strong>
                            {user.name}
                          </strong>

                          {user.identifier &&
                            user.identifier !== "—" && (
                              <small>
                                {user.identifier}
                              </small>
                            )}
                        </div>

                      </div>
                    </td>


                    <td>
                      <span
                        className={`role-badge ${getRoleClass(
                          user.role
                        )}`}
                      >
                        {user.roleLabel}
                      </span>
                    </td>


                    <td>
                      <div className="institution-cell">

                        <strong>
                          {user.institutionName}
                        </strong>

                        <small>
                          {user.institutionType}
                        </small>

                      </div>
                    </td>


                    <td>
                      <div className="contact-cell">

                        <span>
                          {user.email}
                        </span>

                        <small>
                          {user.phone}
                        </small>

                      </div>
                    </td>


                    <td>
                      <span
                        className={
                          user.isActive
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        <span></span>

                        {user.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>


                    <td>
                      <button
                        className="view-user-button"
                        onClick={() =>
                          setSelectedUser(user)
                        }
                      >
                        View
                      </button>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </section>


      {/* =====================================================
          USER DETAILS MODAL
      ===================================================== */}

      {selectedUser && (
        <div
          className="user-modal-overlay"
          onClick={() =>
            setSelectedUser(null)
          }
        >
          <div
            className="user-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="user-modal-header">

              <div>
                <span>
                  User Details
                </span>

                <h2>
                  {selectedUser.name}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() =>
                  setSelectedUser(null)
                }
              >
                ×
              </button>

            </div>


            {/* PROFILE */}

            <div className="user-modal-profile">

              <div className="large-user-avatar">
                {getInitials(
                  selectedUser.name
                )}
              </div>

              <div>

                <h3>
                  {selectedUser.name}
                </h3>

                <span
                  className={`role-badge ${getRoleClass(
                    selectedUser.role
                  )}`}
                >
                  {selectedUser.roleLabel}
                </span>

              </div>

            </div>


            {/* DETAILS */}

            <div className="user-details-grid">

              <div>
                <span>Email</span>

                <strong>
                  {selectedUser.email || "—"}
                </strong>
              </div>


              <div>
                <span>Phone</span>

                <strong>
                  {selectedUser.phone || "—"}
                </strong>
              </div>


              <div>
                <span>Institution</span>

                <strong>
                  {selectedUser.institutionName ||
                    "—"}
                </strong>
              </div>


              <div>
                <span>Institution Type</span>

                <strong>
                  {selectedUser.institutionType ||
                    "—"}
                </strong>
              </div>


              <div>
                <span>Account Status</span>

                <strong>
                  {selectedUser.isActive
                    ? "Active"
                    : "Inactive"}
                </strong>
              </div>


              <div>
                <span>Platform ID</span>

                <strong className="platform-id">
                  {selectedUser.user_id || "—"}
                </strong>
              </div>


              {selectedUser.identifier &&
                selectedUser.identifier !== "—" && (
                  <div>
                    <span>
                      {selectedUser.role === "student"
                        ? "Admission Number"
                        : "Staff Number"}
                    </span>

                    <strong>
                      {selectedUser.identifier}
                    </strong>
                  </div>
                )}


              {selectedUser.studentStatus && (
                <div>
                  <span>
                    Student Status
                  </span>

                  <strong>
                    {formatRole(
                      selectedUser.studentStatus
                    )}
                  </strong>
                </div>
              )}

            </div>


            {/* MODAL FOOTER */}

            <div className="user-modal-footer">

              <button
                type="button"
                onClick={() =>
                  setSelectedUser(null)
                }
              >
                Close
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}


/* =========================================================
   HELPERS
========================================================= */

function getInitials(name) {
  if (!name) {
    return "U";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .substring(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}


export default Users;