import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../services/supabase";
import "./AcademicUnits.css";

const ACADEMIC_LEVELS = [
  { value: "primary", label: "Primary" },
  { value: "junior_school", label: "Junior School" },
  { value: "secondary", label: "Secondary" },
  { value: "college", label: "College" },
  { value: "tvet", label: "TVET" },
  { value: "university", label: "University" },
  { value: "general", label: "General" },
];

const UNIT_TYPES = [
  { value: "subject", label: "Subject" },
  { value: "unit", label: "Course Unit" },
  { value: "course", label: "Course / Module" },
];

const emptyForm = {
  code: "",
  name: "",
  unit_type: "unit",
  academic_level: "university",
  description: "",
  department_id: "",
  programme_id: "",
  class_id: "",
  is_active: true,
};

function AcademicUnits() {
  const [units, setUnits] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [classes, setClasses] = useState([]);

  const [institutionId, setInstitutionId] = useState(null);
  const [institutionType, setInstitutionType] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedDepartmentId, setSelectedDepartmentId] =
    useState("");
  const [selectedProgrammeId, setSelectedProgrammeId] =
    useState("");
  const [selectedClassId, setSelectedClassId] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    loadData();
  }, []);

  const notify = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const normalizeInstitutionType = (type) =>
    String(type || "")
      .toLowerCase()
      .replaceAll("-", "_")
      .replaceAll(" ", "_");

  const normalizedInstitutionType =
    normalizeInstitutionType(institutionType);

  /*
   * Institution categories
   *
   * Explicitly handle Junior Secondary separately so that
   * "junior_secondary" is not accidentally treated as
   * ordinary secondary.
   */
  const isPrimary =
    normalizedInstitutionType === "primary" ||
    normalizedInstitutionType === "primary_school";

  const isJuniorSecondary =
    normalizedInstitutionType === "junior_secondary" ||
    normalizedInstitutionType === "junior_school" ||
    normalizedInstitutionType === "junior";

  const isSecondary =
    normalizedInstitutionType === "secondary" ||
    normalizedInstitutionType === "secondary_school";

  const isUniversity =
    normalizedInstitutionType === "university";

  const isCollege =
    normalizedInstitutionType === "college";

  const isTVET =
    normalizedInstitutionType === "tvet" ||
    normalizedInstitutionType === "tvet_institution";

  const schoolInstitution =
    isPrimary ||
    isJuniorSecondary ||
    isSecondary;

  const hierarchicalInstitution =
    isUniversity ||
    isCollege ||
    isTVET;

  const getPageTitle = () => {
    if (isPrimary) return "Primary School Subjects";

    if (isJuniorSecondary)
      return "Junior School Subjects";

    if (isSecondary)
      return "Secondary School Subjects";

    if (isUniversity)
      return "University Academic Units";

    if (isCollege)
      return "College Academic Units";

    if (isTVET)
      return "TVET Academic Units";

    return "Subjects & Academic Units";
  };

  const getPageDescription = () => {
    if (isPrimary)
      return "Manage subjects for each grade in your primary school.";

    if (isJuniorSecondary)
      return "Manage subjects for each grade in your junior secondary school.";

    if (isSecondary)
      return "Manage subjects for each form in your secondary school.";

    if (isUniversity)
      return "Manage course units and academic modules for your university.";

    if (isCollege)
      return "Manage courses and academic units for your college.";

    if (isTVET)
      return "Manage training modules and academic units for your TVET institution.";

    return "Manage subjects, courses and academic units for your institution.";
  };

  const getLevelLabel = (level) => {
    const found = ACADEMIC_LEVELS.find(
      (item) => item.value === level
    );

    return found?.label || level || "General";
  };

  const getUnitTypeLabel = (type) => {
    const found = UNIT_TYPES.find(
      (item) => item.value === type
    );

    return found?.label || type || "Unknown";
  };

  const loadData = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        notify("Please log in again.", "error");
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
        notify(
          "No active institution administrator account was found.",
          "error"
        );
        return;
      }

      const currentInstitutionId =
        membership.institution_id;

      setInstitutionId(currentInstitutionId);

      const [
        institutionResponse,
        unitsResponse,
        departmentsResponse,
        programmesResponse,
        classesResponse,
      ] = await Promise.all([
        supabase
          .from("institutions")
          .select("institution_type")
          .eq("id", currentInstitutionId)
          .maybeSingle(),

        supabase
          .from("academic_units")
          .select(`
            *,
            departments (
              id,
              name,
              code
            ),
            programmes (
              id,
              name,
              code
            ),
            classes (
              id,
              name,
              academic_year,
              term
            )
          `)
          .eq("institution_id", currentInstitutionId)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("departments")
          .select("id, name, code")
          .eq("institution_id", currentInstitutionId)
          .order("name"),

        supabase
          .from("programmes")
          .select(
            "id, name, code, department_id"
          )
          .eq("institution_id", currentInstitutionId)
          .order("name"),

        supabase
          .from("classes")
          .select(
            "id, name, academic_year, term, department_id, programme_id"
          )
          .eq("institution_id", currentInstitutionId)
          .order("name"),
      ]);

      if (institutionResponse.error)
        throw institutionResponse.error;

      if (unitsResponse.error)
        throw unitsResponse.error;

      if (departmentsResponse.error)
        throw departmentsResponse.error;

      if (programmesResponse.error)
        throw programmesResponse.error;

      if (classesResponse.error)
        throw classesResponse.error;

      setInstitutionType(
        institutionResponse.data?.institution_type || ""
      );

      setUnits(unitsResponse.data || []);
      setDepartments(departmentsResponse.data || []);
      setProgrammes(programmesResponse.data || []);
      setClasses(classesResponse.data || []);
    } catch (error) {
      console.error(
        "Failed to load academic units:",
        error
      );

      notify(
        error.message ||
          "Failed to load academic units.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Programmes belonging to the selected department.
   */
  const pageProgrammes = useMemo(() => {
    if (!selectedDepartmentId) return [];

    return programmes.filter(
      (programme) =>
        programme.department_id ===
        selectedDepartmentId
    );
  }, [
    programmes,
    selectedDepartmentId,
  ]);

  /*
   * Classes belonging to the selected structure.
   *
   * For schools, this allows classes/grades to be selected
   * directly.
   */
  const pageClasses = useMemo(() => {
    return classes.filter((classItem) => {
      if (
        selectedDepartmentId &&
        classItem.department_id &&
        classItem.department_id !==
          selectedDepartmentId
      ) {
        return false;
      }

      if (
        selectedProgrammeId &&
        classItem.programme_id &&
        classItem.programme_id !==
          selectedProgrammeId
      ) {
        return false;
      }

      return true;
    });
  }, [
    classes,
    selectedDepartmentId,
    selectedProgrammeId,
  ]);

  /*
   * Programmes available inside the add/edit form.
   */
  const filteredFormProgrammes = useMemo(() => {
    if (!form.department_id) return [];

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
   * Classes available inside the add/edit form.
   */
  const filteredFormClasses = useMemo(() => {
    return classes.filter((classItem) => {
      if (
        form.department_id &&
        classItem.department_id &&
        classItem.department_id !==
          form.department_id
      ) {
        return false;
      }

      if (
        form.programme_id &&
        classItem.programme_id &&
        classItem.programme_id !==
          form.programme_id
      ) {
        return false;
      }

      return true;
    });
  }, [
    classes,
    form.department_id,
    form.programme_id,
  ]);

  /*
   * Apply the main hierarchy selection.
   *
   * Higher education:
   * Department -> Programme -> Units
   *
   * Schools:
   * Class/Grade -> Subjects
   */
  const hierarchyFilteredUnits = useMemo(() => {
    if (hierarchicalInstitution) {
      if (
        !selectedDepartmentId ||
        !selectedProgrammeId
      ) {
        return [];
      }

      return units.filter(
        (unit) =>
          unit.department_id ===
            selectedDepartmentId &&
          unit.programme_id ===
            selectedProgrammeId
      );
    }

    if (schoolInstitution) {
      if (!selectedClassId) return [];

      return units.filter(
        (unit) =>
          unit.class_id === selectedClassId
      );
    }

    return units;
  }, [
    units,
    hierarchicalInstitution,
    schoolInstitution,
    selectedDepartmentId,
    selectedProgrammeId,
    selectedClassId,
  ]);

  const filteredUnits = useMemo(() => {
    const searchText =
      search.toLowerCase().trim();

    return hierarchyFilteredUnits.filter(
      (unit) => {
        const searchableValues = [
          unit.code,
          unit.name,
          unit.description,
          unit.unit_type,
          unit.academic_level,
          unit.departments?.name,
          unit.departments?.code,
          unit.programmes?.name,
          unit.programmes?.code,
          unit.classes?.name,
        ];

        const matchesSearch =
          !searchText ||
          searchableValues.some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(searchText)
          );

        const matchesLevel =
          levelFilter === "all" ||
          unit.academic_level ===
            levelFilter;

        const matchesType =
          typeFilter === "all" ||
          unit.unit_type === typeFilter;

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" &&
            unit.is_active) ||
          (statusFilter === "inactive" &&
            !unit.is_active);

        return (
          matchesSearch &&
          matchesLevel &&
          matchesType &&
          matchesStatus
        );
      }
    );
  }, [
    hierarchyFilteredUnits,
    search,
    levelFilter,
    typeFilter,
    statusFilter,
  ]);

  const activeCount =
    hierarchyFilteredUnits.filter(
      (unit) => unit.is_active
    ).length;

  const subjectCount =
    hierarchyFilteredUnits.filter(
      (unit) =>
        unit.unit_type === "subject"
    ).length;

  const courseUnitCount =
    hierarchyFilteredUnits.filter(
      (unit) =>
        unit.unit_type === "unit"
    ).length;

  const courseCount =
    hierarchyFilteredUnits.filter(
      (unit) =>
        unit.unit_type === "course"
    ).length;

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((previous) => {
      const updated = {
        ...previous,
        [name]:
          type === "checkbox"
            ? checked
            : value,
      };

      /*
       * Changing department invalidates both
       * programme and class.
       */
      if (name === "department_id") {
        updated.programme_id = "";
        updated.class_id = "";
      }

      /*
       * Changing programme invalidates class
       * where applicable.
       */
      if (name === "programme_id") {
        updated.class_id = "";
      }

      /*
       * Keep school subjects as subjects by default.
       */
      if (
        name === "academic_level" &&
        schoolInstitution
      ) {
        updated.unit_type = "subject";
      }

      return updated;
    });
  };

  const getDefaultAcademicLevel = () => {
    if (isPrimary) return "primary";

    if (isJuniorSecondary)
      return "junior_school";

    if (isSecondary)
      return "secondary";

    if (isUniversity)
      return "university";

    if (isCollege)
      return "college";

    if (isTVET)
      return "tvet";

    return "general";
  };

  const openAddForm = () => {
    setEditingUnit(null);

    setForm({
      ...emptyForm,

      academic_level:
        getDefaultAcademicLevel(),

      unit_type: schoolInstitution
        ? "subject"
        : isTVET
        ? "course"
        : "unit",

      department_id:
        hierarchicalInstitution
          ? selectedDepartmentId
          : "",

      programme_id:
        hierarchicalInstitution
          ? selectedProgrammeId
          : "",

      class_id: schoolInstitution
        ? selectedClassId
        : "",
    });

    setMessage("");
    setShowForm(true);
  };

  const openEditForm = (unit) => {
    setEditingUnit(unit);

    setForm({
      code: unit.code || "",
      name: unit.name || "",

      unit_type: [
        "subject",
        "unit",
        "course",
      ].includes(unit.unit_type)
        ? unit.unit_type
        : "unit",

      academic_level:
        unit.academic_level ||
        getDefaultAcademicLevel(),

      description:
        unit.description || "",

      department_id:
        unit.department_id || "",

      programme_id:
        unit.programme_id || "",

      class_id:
        unit.class_id || "",

      is_active:
        unit.is_active ?? true,
    });

    setMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingUnit(null);
    setForm({ ...emptyForm });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!institutionId) {
      notify(
        "Institution information is missing.",
        "error"
      );
      return;
    }

    const code = form.code.trim();
    const name = form.name.trim();

    if (!code || !name) {
      notify(
        "Please enter both a code and a name.",
        "error"
      );
      return;
    }

    const allowedUnitTypes = [
      "subject",
      "unit",
      "course",
    ];

    if (
      !allowedUnitTypes.includes(
        form.unit_type
      )
    ) {
      notify(
        "Invalid record type. Please select Subject, Course Unit, or Course / Module.",
        "error"
      );
      return;
    }

    /*
     * Higher education requires:
     * Department + Programme
     */
    if (
      hierarchicalInstitution &&
      !form.department_id
    ) {
      notify(
        "Please select a department.",
        "error"
      );
      return;
    }

    if (
      hierarchicalInstitution &&
      !form.programme_id
    ) {
      notify(
        "Please select a programme.",
        "error"
      );
      return;
    }

    /*
     * Schools require a class/grade.
     */
    if (
      schoolInstitution &&
      !form.class_id
    ) {
      notify(
        "Please select a class or grade.",
        "error"
      );
      return;
    }

    /*
     * Validate programme belongs to department.
     */
    if (
      form.department_id &&
      form.programme_id &&
      !filteredFormProgrammes.some(
        (programme) =>
          programme.id ===
          form.programme_id
      )
    ) {
      notify(
        "The selected programme does not belong to the selected department.",
        "error"
      );
      return;
    }

    /*
     * Validate class belongs to selected
     * department/programme structure.
     */
    if (
      form.class_id &&
      !filteredFormClasses.some(
        (classItem) =>
          classItem.id ===
          form.class_id
      )
    ) {
      notify(
        "The selected class does not match the selected department or programme.",
        "error"
      );
      return;
    }

    /*
     * School institutions should only create
     * subjects.
     */
    if (
      schoolInstitution &&
      form.unit_type !== "subject"
    ) {
      notify(
        "School academic records must use the Subject type.",
        "error"
      );
      return;
    }

    const academicLevel = String(
      form.academic_level ||
        getDefaultAcademicLevel()
    )
      .toLowerCase()
      .replaceAll(" ", "_")
      .replaceAll("-", "_");

    setSaving(true);
    setMessage("");

    try {
      const unitData = {
        institution_id:
          institutionId,

        code,

        name,

        unit_type:
          form.unit_type,

        academic_level:
          academicLevel,

        description:
          form.description.trim() ||
          null,

        department_id:
          form.department_id || null,

        programme_id:
          form.programme_id || null,

        class_id:
          form.class_id || null,

        is_active:
          Boolean(form.is_active),
      };

      let databaseError = null;

      if (editingUnit) {
        const { error } =
          await supabase
            .from("academic_units")
            .update(unitData)
            .eq("id", editingUnit.id)
            .eq(
              "institution_id",
              institutionId
            );

        databaseError = error;
      } else {
        const { error } =
          await supabase
            .from("academic_units")
            .insert([unitData]);

        databaseError = error;
      }

      if (databaseError) {
        if (
          databaseError.code ===
            "23514" &&
          String(
            databaseError.message || ""
          ).includes("academic_units")
        ) {
          throw new Error(
            `The database rejected the academic unit type "${unitData.unit_type}". Allowed values are: subject, unit, course.`
          );
        }

        if (
          databaseError.code ===
          "23505"
        ) {
          throw new Error(
            `A record with code "${code}" already exists for this institution.`
          );
            }

          throw databaseError;
        }

        notify(
          editingUnit
            ? "Academic unit updated successfully."
            : "Academic unit created successfully.",
          "success"
        );

        setShowForm(false);
        setEditingUnit(null);
        setForm({ ...emptyForm });

        await loadData();
      } catch (error) {
        console.error(
          "Failed to save academic unit:",
          error
        );

        notify(
          error.message ||
            "Failed to save academic unit.",
          "error"
        );
      } finally {
        setSaving(false);
      }
    };

    const handleDelete = async (unit) => {
      if (actionLoading) return;

      const confirmed = window.confirm(
        `Are you sure you want to delete "${unit.name}" (${unit.code})?`
      );

      if (!confirmed) return;

      setActionLoading(true);
      setMessage("");

      try {
        const { error } =
          await supabase
            .from("academic_units")
            .delete()
            .eq("id", unit.id)
            .eq(
              "institution_id",
              institutionId
            );

        if (error) throw error;

        notify(
          "Academic unit deleted successfully.",
          "success"
        );

        await loadData();
      } catch (error) {
        console.error(
          "Failed to delete academic unit:",
          error
        );

        notify(
          error.message ||
            "Failed to delete academic unit.",
          "error"
        );
      } finally {
        setActionLoading(false);
      }
    };

    const toggleStatus = async (unit) => {
      if (actionLoading) return;

      setActionLoading(true);
      setMessage("");

      try {
        const { error } =
          await supabase
            .from("academic_units")
            .update({
              is_active:
                !unit.is_active,
            })
            .eq("id", unit.id)
            .eq(
              "institution_id",
              institutionId
            );

        if (error) throw error;

        notify(
          unit.is_active
            ? "Academic unit deactivated."
            : "Academic unit activated.",
          "success"
        );

        await loadData();
      } catch (error) {
        console.error(
          "Failed to change academic unit status:",
          error
        );

        notify(
          error.message ||
            "Failed to change academic unit status.",
          "error"
        );
      } finally {
        setActionLoading(false);
      }
    };

    const getDepartmentLabel = (unit) => {
      if (!unit.departments) {
        return "—";
      }

      return unit.departments.code
        ? `${unit.departments.name} (${unit.departments.code})`
        : unit.departments.name;
    };

    const getProgrammeLabel = (unit) => {
      if (!unit.programmes) {
        return "—";
      }

      return unit.programmes.code
        ? `${unit.programmes.name} (${unit.programmes.code})`
        : unit.programmes.name;
    };

    const getClassLabel = (unit) => {
      if (!unit.classes) {
        return "—";
      }

      let label =
        unit.classes.name || "Unnamed";

      if (unit.classes.academic_year) {
        label += ` • ${unit.classes.academic_year}`;
      }

      if (unit.classes.term) {
        label += ` • ${unit.classes.term}`;
      }

      return label;
    };

    const getClassSelectionLabel = () => {
      if (isPrimary) {
        return "Select Grade";
      }

      if (isJuniorSecondary) {
        return "Select Grade";
      }

      if (isSecondary) {
        return "Select Form";
      }

      return "Select Class";
    };

    const getClassColumnLabel = () => {
      if (isPrimary) {
        return "Grade";
      }

      if (isJuniorSecondary) {
        return "Grade";
      }

      if (isSecondary) {
        return "Form";
      }

      return "Class";
    };

    const getDepartmentSelectionLabel = () => {
      if (isUniversity) {
        return "Department";
      }

      if (isCollege) {
        return "Department";
      }

      if (isTVET) {
        return "Department";
      }

      return "Department";
    };

    const getProgrammeSelectionLabel = () => {
      if (isUniversity) {
        return "Programme";
      }

      if (isCollege) {
        return "Programme";
      }

      if (isTVET) {
        return "Programme";
      }

      return "Programme";
    };

    if (loading) {
      return (
        <div className="p-6">
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>

              <p className="text-sm text-gray-500">
                Loading academic units...
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="academic-units-page">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getPageTitle()}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {getPageDescription()}
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Add Academic Unit
          </button>
        </div>

        {/* Notification */}
        {message && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              messageType === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {hierarchyFilteredUnits.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Active
            </p>

            <p className="mt-2 text-2xl font-bold text-green-600">
              {activeCount}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Subjects
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-600">
              {subjectCount}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Units / Courses
            </p>

            <p className="mt-2 text-2xl font-bold text-purple-600">
              {courseUnitCount +
                courseCount}
            </p>
          </div>
        </div>

        {/* Hierarchy selection */}
        {hierarchicalInstitution && (
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-semibold text-gray-900">
                Academic Structure
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select a department and programme
                to view its academic units.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {getDepartmentSelectionLabel()}
                </label>

                <select
                  value={
                    selectedDepartmentId
                  }
                  onChange={(event) => {
                    setSelectedDepartmentId(
                      event.target.value
                    );
                    setSelectedProgrammeId(
                      ""
                    );
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                          ? `${department.name} (${department.code})`
                          : department.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {getProgrammeSelectionLabel()}
                </label>

                <select
                  value={
                    selectedProgrammeId
                  }
                  onChange={(event) =>
                    setSelectedProgrammeId(
                      event.target.value
                    )
                  }
                  disabled={
                    !selectedDepartmentId
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    {selectedDepartmentId
                      ? "Select Programme"
                      : "Select Department First"}
                  </option>

                  {pageProgrammes.map(
                    (programme) => (
                      <option
                        key={programme.id}
                        value={programme.id}
                      >
                        {programme.code
                          ? `${programme.name} (${programme.code})`
                          : programme.name}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* School class selection */}
        {schoolInstitution && (
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-semibold text-gray-900">
                Select {getClassColumnLabel()}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Choose a class or grade to view its
                subjects.
              </p>
            </div>

            <select
              value={selectedClassId}
              onChange={(event) =>
                setSelectedClassId(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:max-w-md"
            >
              <option value="">
                {getClassSelectionLabel()}
              </option>

              {pageClasses.map((classItem) => (
                <option
                  key={classItem.id}
                  value={classItem.id}
                >
                  {classItem.name}
                  {classItem.academic_year
                    ? ` • ${classItem.academic_year}`
                    : ""}
                  {classItem.term
                    ? ` • ${classItem.term}`
                    : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search and filters */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Search
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search by code, name, department..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Academic Level
              </label>

              <select
                value={levelFilter}
                onChange={(event) =>
                  setLevelFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">
                  All Levels
                </option>

                {ACADEMIC_LEVELS.map(
                  (level) => (
                    <option
                      key={level.value}
                      value={level.value}
                    >
                      {level.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Type
              </label>

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">
                  All Types
                </option>

                {UNIT_TYPES.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label className="mr-3 text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">
                  All
                </option>

                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </div>

            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {filteredUnits.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-900">
                {hierarchyFilteredUnits.length}
              </span>{" "}
              records
            </p>
          </div>
        </div>

        {/* Academic units table */}
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Code
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Name
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Type
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Level
                  </th>

                  {hierarchicalInstitution && (
                    <>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Department
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Programme
                      </th>
                    </>
                  )}

                  {schoolInstitution && (
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {getClassColumnLabel()}
                    </th>
                  )}

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredUnits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        6 +
                        (hierarchicalInstitution
                          ? 2
                          : 0) +
                        (schoolInstitution
                          ? 1
                          : 0)
                      }
                      className="px-5 py-12 text-center"
                    >
                      <div className="text-gray-400">
                        <div className="mb-2 text-4xl">
                          📚
                        </div>

                        <p className="font-medium text-gray-700">
                          No academic units found
                        </p>

                        <p className="mt-1 text-sm">
                          {hierarchicalInstitution &&
                          (!selectedDepartmentId ||
                            !selectedProgrammeId)
                            ? "Select a department and programme first."
                            : schoolInstitution &&
                              !selectedClassId
                            ? "Select a class or grade first."
                            : "Try changing your filters or add a new academic unit."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map((unit) => (
                    <tr
                      key={unit.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="font-semibold text-gray-900">
                          {unit.code}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">
                          {unit.name}
                        </div>

                        {unit.description && (
                          <div className="mt-1 max-w-xs truncate text-xs text-gray-500">
                            {unit.description}
                          </div>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {getUnitTypeLabel(
                            unit.unit_type
                          )}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                        {getLevelLabel(
                          unit.academic_level
                        )}
                      </td>

                      {hierarchicalInstitution && (
                        <>
                          <td className="px-5 py-4 text-sm text-gray-600">
                            {getDepartmentLabel(
                              unit
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-gray-600">
                            {getProgrammeLabel(
                              unit
                            )}
                          </td>
                        </>
                      )}

                      {schoolInstitution && (
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {getClassLabel(unit)}
                        </td>
                      )}

                      <td className="whitespace-nowrap px-5 py-4">
                        {unit.is_active ? (
                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(unit)
                            }
                            disabled={actionLoading}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleStatus(unit)
                            }
                            disabled={actionLoading}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              unit.is_active
                                ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                : "bg-green-50 text-green-700 hover:bg-green-100"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {unit.is_active
                              ? "Disable"
                              : "Enable"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(unit)
                            }
                            disabled={actionLoading}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingUnit
                      ? "Edit Academic Unit"
                      : "Add Academic Unit"}
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    {schoolInstitution
                      ? "Create a subject for a specific class or grade."
                      : "Create an academic unit within the institution structure."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg px-3 py-2 text-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5 p-6"
              >
                {/* Basic Information */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Code */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Code *
                    </label>

                    <input
                      type="text"
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      placeholder={
                        schoolInstitution
                          ? "e.g. MATH"
                          : "e.g. CSC101"
                      }
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {schoolInstitution
                        ? "Subject Name *"
                        : "Unit / Course Name *"}
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder={
                        schoolInstitution
                          ? "e.g. Mathematics"
                          : "e.g. Database Systems"
                      }
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Type *
                    </label>

                    <select
                      name="unit_type"
                      value={form.unit_type}
                      onChange={handleChange}
                      disabled={schoolInstitution}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {UNIT_TYPES.map((type) => (
                        <option
                          key={type.value}
                          value={type.value}
                        >
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Academic Level */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Academic Level *
                    </label>

                    <select
                      name="academic_level"
                      value={form.academic_level}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {ACADEMIC_LEVELS.map(
                        (level) => (
                          <option
                            key={level.value}
                            value={level.value}
                          >
                            {level.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                {/* Higher Education Structure */}
                {hierarchicalInstitution && (
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <h3 className="mb-4 text-sm font-semibold text-gray-900">
                      Academic Structure
                    </h3>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {/* Department */}
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Department *
                        </label>

                        <select
                          name="department_id"
                          value={
                            form.department_id
                          }
                          onChange={handleChange}
                          required
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                                  ? `${department.name} (${department.code})`
                                  : department.name}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {/* Programme */}
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Programme *
                        </label>

                        <select
                          name="programme_id"
                          value={
                            form.programme_id
                          }
                          onChange={handleChange}
                          required
                          disabled={
                            !form.department_id
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="">
                            {form.department_id
                              ? "Select Programme"
                              : "Select Department First"}
                          </option>

                          {filteredFormProgrammes.map(
                            (programme) => (
                              <option
                                key={programme.id}
                                value={programme.id}
                              >
                                {programme.code
                                  ? `${programme.name} (${programme.code})`
                                  : programme.name}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* School Class */}
                {schoolInstitution && (
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <h3 className="mb-4 text-sm font-semibold text-gray-900">
                      Class Assignment
                    </h3>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        {getClassColumnLabel()} *
                      </label>

                      <select
                        name="class_id"
                        value={form.class_id}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">
                          {getClassSelectionLabel()}
                        </option>

                        {filteredFormClasses.map(
                          (classItem) => (
                            <option
                              key={classItem.id}
                              value={classItem.id}
                            >
                              {classItem.name}
                              {classItem.academic_year
                                ? ` • ${classItem.academic_year}`
                                : ""}
                              {classItem.term
                                ? ` • ${classItem.term}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Optional description..."
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Active */}
                <div className="rounded-lg border bg-gray-50 p-4">
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    <span>
                      <span className="block text-sm font-medium text-gray-900">
                        Active academic unit
                      </span>

                      <span className="block text-xs text-gray-500">
                        Active units can be assigned
                        to students and used for
                        marks/results.
                      </span>
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={saving}
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingUnit
                      ? "Update Academic Unit"
                      : "Create Academic Unit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  export default AcademicUnits;