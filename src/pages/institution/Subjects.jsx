import { useEffect, useState } from "react";
import { supabase } from "../../services/supabase";

export default function Subjects() {
  const [institution, setInstitution] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    code: "",
    class_id: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Please log in first.");

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
        throw new Error("No active institution administrator account found.");
      }

      const institutionId = membership.institution_id;

      const [
        { data: institutionData, error: institutionError },
        { data: classData, error: classError },
        { data: subjectData, error: subjectError },
      ] = await Promise.all([
        supabase
          .from("institutions")
          .select("*")
          .eq("id", institutionId)
          .single(),

        supabase
          .from("classes")
          .select("id, name")
          .eq("institution_id", institutionId)
          .order("name"),

        supabase
          .from("subjects")
          .select(`
            id,
            name,
            code,
            is_active,
            subject_assignments (
              id,
              class_id,
              classes (
                id,
                name
              )
            )
          `)
          .eq("institution_id", institutionId)
          .order("name"),
      ]);

      if (institutionError) throw institutionError;
      if (classError) throw classError;
      if (subjectError) throw subjectError;

      setInstitution(institutionData);
      setClasses(classData || []);
      setSubjects(subjectData || []);
    } catch (err) {
      setError(err.message || "Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!form.name.trim()) {
      setError("Enter the subject name.");
      return;
    }

    if (!form.class_id) {
      setError("Select a class or form.");
      return;
    }

    setSaving(true);

    try {
      let subjectId;

      const { data: existingSubject, error: existingError } =
        await supabase
          .from("subjects")
          .select("id")
          .eq("institution_id", institution.id)
          .ilike("name", form.name.trim())
          .maybeSingle();

      if (existingError) throw existingError;

      if (existingSubject) {
        subjectId = existingSubject.id;
      } else {
        const { data: newSubject, error: insertError } =
          await supabase
            .from("subjects")
            .insert({
              institution_id: institution.id,
              name: form.name.trim(),
              code: form.code.trim() || null,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        subjectId = newSubject.id;
      }

      const { error: assignmentError } = await supabase
        .from("subject_assignments")
        .insert({
          institution_id: institution.id,
          subject_id: subjectId,
          class_id: form.class_id,
          is_active: true,
        });

      if (assignmentError) throw assignmentError;

      setMessage("Subject successfully saved and assigned.");
      setForm({
        name: "",
        code: "",
        class_id: "",
      });

      await loadData();
    } catch (err) {
      setError(
        err.code === "23505"
          ? "This subject is already assigned to that class."
          : err.message || "Failed to save subject."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSubject(subject) {
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("subjects")
      .update({ is_active: !subject.is_active })
      .eq("id", subject.id)
      .eq("institution_id", institution.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Subject status updated.");
    await loadData();
  }

  if (loading) {
    return <div style={styles.container}>Loading subjects...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Subjects & Learning Areas</h2>
          <p style={styles.subtitle}>
            Manage subjects and assign them to classes or forms.
          </p>
        </div>

        <div style={styles.count}>
          {subjects.length} Subjects
        </div>
      </div>

      {message && <div style={styles.success}>{message}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Register or Assign Subject</h3>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Subject Name</label>
              <input
                style={styles.input}
                type="text"
                placeholder="e.g. Mathematics"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label style={styles.label}>Subject Code</label>
              <input
                style={styles.input}
                type="text"
                placeholder="e.g. MAT"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value })
                }
              />
            </div>

            <div>
              <label style={styles.label}>Class / Form / Grade</label>
              <select
                style={styles.input}
                value={form.class_id}
                onChange={(e) =>
                  setForm({ ...form, class_id: e.target.value })
                }
                required
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={styles.button}
          >
            {saving ? "Saving..." : "Save & Assign Subject"}
          </button>
        </form>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Registered Subjects</h3>

        {subjects.length === 0 ? (
          <p style={styles.empty}>No subjects registered yet.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>Assigned Classes</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {subjects.map((subject) => {
                  const assignedClasses =
                    subject.subject_assignments
                      ?.map((assignment) => assignment.classes?.name)
                      .filter(Boolean) || [];

                  return (
                    <tr key={subject.id}>
                      <td style={styles.td}>
                        <strong>{subject.name}</strong>
                      </td>

                      <td style={styles.td}>
                        {subject.code || "—"}
                      </td>

                      <td style={styles.td}>
                        {assignedClasses.length
                          ? [...new Set(assignedClasses)].join(", ")
                          : "Not assigned"}
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            background: subject.is_active
                              ? "#dcfce7"
                              : "#fee2e2",
                            color: subject.is_active
                              ? "#166534"
                              : "#991b1b",
                          }}
                        >
                          {subject.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <button
                          type="button"
                          onClick={() => toggleSubject(subject)}
                          style={styles.actionButton}
                        >
                          {subject.is_active ? "Deactivate" : "Activate"}
                        </button>
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

const styles = {
  container: {
    padding: "24px",
    color: "#1e293b",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "24px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    margin: 0,
  },
  subtitle: {
    color: "#64748b",
    marginTop: "6px",
  },
  count: {
    background: "#e0edff",
    color: "#064789",
    padding: "10px 16px",
    borderRadius: "8px",
    fontWeight: "600",
  },
  card: {
    background: "#fff",
    padding: "22px",
    borderRadius: "12px",
    marginBottom: "24px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: "20px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "18px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    fontSize: "14px",
  },
  button: {
    background: "#064789",
    color: "#fff",
    border: "none",
    padding: "12px 20px",
    borderRadius: "7px",
    cursor: "pointer",
    fontWeight: "600",
  },
  success: {
    background: "#dcfce7",
    color: "#166534",
    padding: "12px",
    borderRadius: "7px",
    marginBottom: "16px",
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "12px",
    borderRadius: "7px",
    marginBottom: "16px",
  },
  empty: {
    color: "#64748b",
  },
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    minWidth: "650px",
  },
  th: {
    padding: "13px",
    background: "#f1f5f9",
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: "13px",
    borderBottom: "1px solid #e2e8f0",
  },
  badge: {
    padding: "5px 9px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },
  actionButton: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    padding: "7px 10px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};