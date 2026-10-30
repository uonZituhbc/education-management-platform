import {
BrowserRouter,
Routes,
Route,
Link,
useNavigate,
} from "react-router-dom";

import { useState, useEffect } from "react";
import { supabase } from "./services/supabase";
import "./Home.css";

// Notification component
import NotificationBell from "./components/NotificationBell";

// Institution pages
import Departments from "./pages/institution/Departments";
import Programmes from "./pages/institution/Programmes";
import Staff from "./pages/institution/Staff";
import TeachingAssignments from "./pages/institution/TeachingAssignments";
import Students from "./pages/institution/Students";
import Classes from "./pages/institution/Classes";
import AcademicUnits from "./pages/institution/AcademicUnits";
import StaffAcceptInvite from "./pages/institution/StaffAcceptInvite";
import Results from "./pages/institution/Results";
import GradingScales from "./pages/institution/GradingScales";
import ResultProcessing from "./pages/institution/ResultProcessing";
import StudentResults from "./pages/institution/StudentResults";
import Settings from "./pages/institution/Settings";
import HelpSupport from "./pages/institution/HelpSupport";
import MySupportTickets from "./pages/institution/MySupportTickets";
import Subjects from "./pages/institution/Subjects";

// Staff pages
import StaffPortal from "./pages/staff/StaffPortal";
import StaffMarks from "./pages/staff/StaffMarks";

// Super Admin pages
import SuperAdminLayout from "./pages/superadmin/SuperAdminLayout";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import Institutions from "./pages/superadmin/Institutions";
import Users from "./pages/superadmin/Users";
import Analytics from "./pages/superadmin/Analytics";
import ActivityLogs from "./pages/superadmin/ActivityLogs";
import PlatformSettings from "./pages/superadmin/PlatformSettings";
import SupportTickets from "./pages/superadmin/SupportTickets";

/* =========================================================
EMP PUBLIC HOMEPAGE
========================================================= */

function Home() {
const features = [
{
icon: "🎓",
title: "Student Management",
description:
"Organize student information and maintain accessible institutional records.",
},
{
icon: "👩‍🏫",
title: "Staff Management",
description:
"Manage staff records and coordinate teaching responsibilities.",
},
{
icon: "🏢",
title: "Department Management",
description:
"Organize departments and establish a clear institutional structure.",
},
{
icon: "📚",
title: "Programmes & Academic Units",
description:
"Manage academic programmes, subjects, and learning units.",
},
{
icon: "📝",
title: "Results & Grading",
description:
"Support marks entry, grading, results processing, and academic review.",
},
{
icon: "📊",
title: "Academic Reporting",
description:
"Support the preparation and management of academic results and reports.",
},
{
icon: "🔐",
title: "Access & Security",
description:
"Provide authenticated access to platform features according to user roles.",
},
{
icon: "🎧",
title: "Help & Support",
description:
"Submit support requests and follow up on issues affecting your institution.",
},
];

const institutionTypes = [
{
icon: "🏫",
title: "Schools",
description:
"Manage students, classes, staff, and academic performance.",
},
{
icon: "🎓",
title: "Colleges",
description:
"Organize programmes, departments, students, and academic records.",
},
{
icon: "🛠️",
title: "TVET Institutions",
description:
"Coordinate technical programmes, trainees, instructors, and assessments.",
},
{
icon: "🏛️",
title: "Universities",
description:
"Manage academic structures, teaching assignments, and results processing.",
},
];

return (
<div className="emp-home">
{/* Navigation */}
<header className="emp-navbar">
<Link to="/" className="emp-brand">
<span className="emp-brand-icon">E</span>

<span>  
        <strong>EMP</strong>  
        <small>Education Management Platform</small>  
      </span>  
    </Link>  

    <nav className="emp-nav-links" aria-label="Main navigation">  
      <a href="#home">Home</a>  
      <a href="#about">About</a>  
      <a href="#features">Features</a>  
      <a href="#institutions">Institutions</a>  
      <a href="#contact">Contact</a>  

      <Link to="/login" className="emp-nav-login">  
        Login  
      </Link>  

      <Link to="/register" className="emp-nav-register">  
        Register Your Institution  
      </Link>  
    </nav>  
  </header>  

  <main>  
    {/* Hero section */}  
    <section className="emp-hero" id="home">  
      <div className="emp-hero-content">  
        <span className="emp-eyebrow">  
          EDUCATION MANAGEMENT, REIMAGINED  
        </span>  

        <h1>  
          One Platform.  
          <br />  
          Every Institution.  
          <br />  
          <span>Smarter Education.</span>  
        </h1>  

        <p className="emp-hero-description">  
          Manage your institution with greater organization,  
          clarity, and efficiency. EMP brings essential academic  
          and administrative tools together in one platform  
          designed for schools, colleges, TVET institutions,  
          and universities.  
        </p>  

        <div className="emp-hero-actions">  
          <Link to="/register" className="emp-button-primary">  
            Register Your Institution  
            <span aria-hidden="true"> →</span>  
          </Link>  

          <Link to="/login" className="emp-button-secondary">  
            Login to EMP  
          </Link>  
        </div>  

        <div className="emp-hero-note">  
          <span aria-hidden="true">✓</span>  
          A centralized platform for institutional management.  
        </div>  
      </div>  

      <div className="emp-hero-visual">  
        <div className="emp-visual-glow" />  

        <div className="emp-preview-card">  
          <div className="emp-preview-top">  
            <div>  
              <span className="emp-preview-label">  
                YOUR INSTITUTION  
              </span>  
              <h3>One organized workspace</h3>  
            </div>  

            <span className="emp-preview-icon">✦</span>  
          </div>  

          <div className="emp-preview-grid">  
            <div className="emp-preview-item">  
              <span>👨‍🎓</span>  
              <strong>Students</strong>  
              <small>Student records</small>  
            </div>  

            <div className="emp-preview-item">  
              <span>👩‍🏫</span>  
              <strong>Staff</strong>  
              <small>Staff records</small>  
            </div>  

            <div className="emp-preview-item">  
              <span>📚</span>  
              <strong>Academics</strong>  
              <small>Programmes & units</small>  
            </div>  

            <div className="emp-preview-item">  
              <span>📊</span>  
              <strong>Results</strong>  
              <small>Academic processing</small>  
            </div>  
          </div>  

          <div className="emp-preview-footer">  
            <span className="emp-status-dot" />  
            Built for organized education management  
          </div>  
        </div>  

        <div className="emp-floating-card emp-floating-top">  
          <span>📘</span>  
          <div>  
            <strong>Academic Management</strong>  
            <small>Organize academic information</small>  
          </div>  
        </div>  

        <div className="emp-floating-card emp-floating-bottom">  
          <span>🔐</span>  
          <div>  
            <strong>Controlled Access</strong>  
            <small>For authorized users</small>  
          </div>  
        </div>  
      </div>  
    </section>  

    {/* Introduction */}  
    <section className="emp-about section-container" id="about">  
      <div className="emp-section-heading">  
        <span className="emp-eyebrow">INTRODUCING EMP</span>  

        <h2>  
          Everything starts with  
          <span> better organization.</span>  
        </h2>  

        <p>  
          Education institutions handle students, staff, academic  
          programmes, results, and many administrative  
          responsibilities. EMP is designed to bring these  
          activities into a more organized digital environment.  
        </p>  
      </div>  

      <div className="emp-about-highlight">  
        <div className="emp-about-icon">🌐</div>  

        <div>  
          <h3>One connected management platform</h3>  

          <p>  
            Replace scattered administrative processes with a  
            structured workspace where authorized users can  
            access the tools and information relevant to their  
            responsibilities.  
          </p>  
        </div>  
      </div>  
    </section>  

    {/* Institutions served */}  
    <section  
      className="emp-institutions section-container"  
      id="institutions"  
    >  
      <div className="emp-section-heading">  
        <span className="emp-eyebrow">WHO WE SERVE</span>  

        <h2>  
          Built for different  
          <span> learning institutions.</span>  
        </h2>  

        <p>  
          Whether you manage a school or a higher-learning  
          institution, EMP is designed to support your  
          institution's management needs.  
        </p>  
      </div>  

      <div className="emp-institution-grid">  
        {institutionTypes.map((institution) => (  
          <article  
            className="emp-institution-card"  
            key={institution.title}  
          >  
            <div className="emp-card-icon">  
              {institution.icon}  
            </div>  

            <h3>{institution.title}</h3>  

            <p>{institution.description}</p>  

            <Link to="/register" className="emp-card-link">  
              Get started <span aria-hidden="true">→</span>  
            </Link>  
          </article>  
        ))}  
      </div>  
    </section>  

    {/* Features */}  
    <section className="emp-features-section" id="features">  
      <div className="section-container">  
        <div className="emp-section-heading">  
          <span className="emp-eyebrow">PLATFORM CAPABILITIES</span>  

          <h2>  
            Essential tools for  
            <span> everyday management.</span>  
          </h2>  

          <p>  
            Explore the key areas EMP is designed to bring  
            together to support institutional administration  
            and academic operations.  
          </p>  
        </div>  

        <div className="emp-feature-grid">  
          {features.map((feature) => (  
            <article  
              className="emp-feature-card"  
              key={feature.title}  
            >  
              <div className="emp-feature-icon">  
                {feature.icon}  
              </div>  

              <h3>{feature.title}</h3>  

              <p>{feature.description}</p>  
            </article>  
          ))}  
        </div>  
      </div>  
    </section>  

    {/* Benefits */}  
    <section className="emp-benefits section-container">  
      <div className="emp-benefits-content">  
        <span className="emp-eyebrow">WHY EMP?</span>  

        <h2>  
          Spend less time  
          <br />  
          chasing information.  
        </h2>  

        <p>  
          A well-organized institution needs accessible records,  
          clear responsibilities, and reliable administrative  
          processes. EMP aims to help institutions work more  
          efficiently through a centralized digital platform.  
        </p>  

        <Link to="/register" className="emp-button-primary">  
          Bring Your Institution to EMP →  
        </Link>  
      </div>  

      <div className="emp-benefits-list">  
        <div className="emp-benefit-item">  
          <span>✓</span>  
          <div>  
            <h3>Centralized information</h3>  
            <p>  
              Keep institutional information organized in one  
              management environment.  
            </p>  
          </div>  
        </div>  

        <div className="emp-benefit-item">  
          <span>✓</span>  
          <div>  
            <h3>Structured workflows</h3>  
            <p>  
              Organize academic and administrative activities  
              around defined responsibilities.  
            </p>  
          </div>  
        </div>  

        <div className="emp-benefit-item">  
          <span>✓</span>  
          <div>  
            <h3>Improved coordination</h3>  
            <p>  
              Help authorized staff and administrators work  
              within a shared institutional system.  
            </p>  
          </div>  
        </div>  

        <div className="emp-benefit-item">  
          <span>✓</span>  
          <div>  
            <h3>Room to grow</h3>  
            <p>  
              A platform concept designed to accommodate  
              different types of education institutions.  
            </p>  
          </div>  
        </div>  
      </div>  
    </section>  

    {/* How it works */}  
    <section className="emp-how-section">  
      <div className="section-container">  
        <div className="emp-section-heading">  
          <span className="emp-eyebrow">GETTING STARTED</span>  

          <h2>  
            Three steps to  
            <span> get started.</span>  
          </h2>  

          <p>  
            Start your institution's journey towards more  
            organized digital management.  
          </p>  
        </div>  

        <div className="emp-steps-grid">  
          <article className="emp-step-card">  
            <span className="emp-step-number">01</span>  
            <div className="emp-step-icon">📝</div>  
            <h3>Register</h3>  
            <p>  
              Submit your institution's details and create an  
              administrator account.  
            </p>  
          </article>  

          <article className="emp-step-card">  
            <span className="emp-step-number">02</span>  
            <div className="emp-step-icon">⚙️</div>  
            <h3>Set Up</h3>  
            <p>  
              Configure your institution's information and  
              organize its academic structure.  
            </p>  
          </article>  

          <article className="emp-step-card">  
            <span className="emp-step-number">03</span>  
            <div className="emp-step-icon">🚀</div>  
            <h3>Manage</h3>  
            <p>  
              Use the available EMP tools to support your  
              institution's everyday operations.  
            </p>  
          </article>  
        </div>  
      </div>  
    </section>  

    {/* Final call to action */}  
    <section className="emp-final-cta" id="contact">  
      <div className="emp-final-cta-content">  
        <span className="emp-eyebrow">  
          THE FUTURE OF EDUCATION MANAGEMENT  
        </span>  

        <h2>  
          Ready to move your institution forward?  
        </h2>  

        <p>  
          Start with EMP and explore a more organized approach  
          to education management.  
        </p>  

        <div className="emp-hero-actions">  
          <Link to="/register" className="emp-button-light">  
            Register Your Institution →  
          </Link>  

          <Link to="/login" className="emp-button-outline-light">  
            Already registered? Login  
          </Link>  
        </div>  
      </div>  
    </section>  
  </main>  

  {/* Footer */}  
  <footer className="emp-footer">  
    <div className="emp-footer-main section-container">  
      <div className="emp-footer-brand">  
        <Link to="/" className="emp-brand">  
          <span className="emp-brand-icon">E</span>  

          <span>  
            <strong>EMP</strong>  
            <small>Education Management Platform</small>  
          </span>  
        </Link>  

        <p>  
          Supporting more organized education management  
          through digital solutions for learning institutions.  
        </p>  
      </div>  

      <div className="emp-footer-column">  
        <h3>Explore</h3>  
        <a href="#home">Home</a>  
        <a href="#about">About EMP</a>  
        <a href="#features">Features</a>  
        <a href="#institutions">Institutions</a>  
      </div>  

      <div className="emp-footer-column">  
        <h3>Platform</h3>  
        <Link to="/register">Register Institution</Link>  
        <Link to="/login">Login</Link>  
      </div>  

      <div className="emp-footer-column">  
        <h3>Need assistance?</h3>  
        <p>  
          Institution administrators can access Help & Support  
          after signing in to EMP.  
        </p>  
      </div>  
    </div>  

    <div className="emp-footer-bottom">  
      <p>  
        © {new Date().getFullYear()} Education Management  
        Platform (EMP). All rights reserved.  
      </p>  

      <a href="#home">Back to top ↑</a>  
    </div>  
  </footer>  
</div>

);
}

/* =========================================================
LOGIN
========================================================= */

function Login() {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [message, setMessage] = useState("");
const [submitting, setSubmitting] = useState(false);

const navigate = useNavigate();

const handleLogin = async (e) => {
e.preventDefault();

setSubmitting(true);  
setMessage("Logging in...");  

try {  
  const { data, error } = await supabase.auth.signInWithPassword({  
    email,  
    password,  
  });  

  if (error) throw error;  

  const user = data?.user;  

  if (!user) {  
    throw new Error("Login failed. Please try again.");  
  }  

  // Check whether the user is an active Super Admin.  
  const {  
    data: superAdmin,  
    error: superAdminError,  
  } = await supabase  
    .from("super_admins")  
    .select("id, is_active")  
    .eq("user_id", user.id)  
    .eq("is_active", true)  
    .maybeSingle();  

  if (superAdminError) {  
    console.error(  
      "Super Admin check error:",  
      superAdminError  
    );  
  }  

  // Super Admin → Super Admin Dashboard.  
  if (superAdmin) {  
    navigate("/dashboard/super-admin");  
    return;  
  }  

  // Normal institution admin → Institution Dashboard.  
  navigate("/dashboard");  
} catch (error) {  
  setMessage(error.message || "Login failed.");  
} finally {  
  setSubmitting(false);
}
};

return (
<div className="auth-page">
<div className="auth-card">
<h1>Welcome Back</h1>

<p>Sign in to your EMP account</p>  

    <form onSubmit={handleLogin}>  
      <label>Email</label>  

      <input  
        type="email"  
        placeholder="Enter your email"  
        value={email}  
        onChange={(e) => setEmail(e.target.value)}  
        required  
      />  

      <label>Password</label>  

      <input  
        type="password"  
        placeholder="Enter your password"  
        value={password}  
        onChange={(e) => setPassword(e.target.value)}  
        required  
      />  

      <button type="submit" disabled={submitting}>  
        {submitting ? "Logging in..." : "Login"}  
      </button>  
    </form>  

    {message && <p>{message}</p>}  

    <p>  
      Don't have an account?{" "}  
      <Link to="/register">Register Institution</Link>  
    </p>  
  </div>  
</div>

);
}

/* =========================================================
REGISTER
========================================================= */

function Register() {
const [institutionName, setInstitutionName] = useState("");
const [institutionType, setInstitutionType] = useState("");
const [email, setEmail] = useState("");
const [phone, setPhone] = useState("");
const [password, setPassword] = useState("");
const [message, setMessage] = useState("");
const [submitting, setSubmitting] = useState(false);

const handleRegister = async (e) => {
e.preventDefault();

setSubmitting(true);  
setMessage("Creating your institution...");  

try {  
  const { data, error } = await supabase.auth.signUp({  
    email,  
    password,  
    options: {  
      emailRedirectTo: window.location.origin,  
      data: {  
        institution_name: institutionName,  
        institution_type: institutionType,  
        institution_phone: phone,  
      },  
    },  
  });  

  if (error) throw error;  

  if (!data.user) {  
    throw new Error(  
      "Registration failed. Please try again."  
    );  
  }  

  setMessage(  
    "Registration submitted successfully! Please check your email to verify your account, then log in."  
  );  

  setInstitutionName("");  
  setInstitutionType("");  
  setEmail("");  
  setPhone("");  
  setPassword("");  
} catch (error) {  
  setMessage(error.message || "Registration failed.");  
} finally {  
  setSubmitting(false);  
}

};

return (
<div className="auth-page">
<div className="auth-card">
<h1>Register Institution</h1>

<p>Create your institution on EMP</p>  

    <form onSubmit={handleRegister}>  
      <label>Institution Name</label>  

      <input  
        type="text"  
        placeholder="Enter institution name"  
        value={institutionName}  
        onChange={(e) => setInstitutionName(e.target.value)}  
        required  
      />  

      <label>Institution Type</label>  

      <select  
        value={institutionType}  
        onChange={(e) => setInstitutionType(e.target.value)}  
        required  
      >  
        <option value="">Select institution type</option>  
        <option value="primary">Primary School</option>  
        <option value="secondary">Secondary School</option>  
        <option value="college">College</option>  
        <option value="tvet">TVET</option>  
        <option value="university">University</option>  
        <option value="other">Other</option>  
      </select>  

      <label>Institution Email</label>  

      <input  
        type="email"  
        placeholder="Institution email"  
        value={email}  
        onChange={(e) => setEmail(e.target.value)}  
        required  
      />  

      <label>Phone Number</label>  

      <input  
        type="tel"  
        placeholder="Phone number"  
        value={phone}  
        onChange={(e) => setPhone(e.target.value)}  
        required  
      />  

      <label>Admin Password</label>  

      <input  
        type="password"  
        placeholder="Create a password"  
        value={password}  
        onChange={(e) => setPassword(e.target.value)}  
        required  
        minLength={6}  
      />  

      <button type="submit" disabled={submitting}>  
        {submitting ? "Creating..." : "Create Institution"}  
      </button>  
    </form>  

    {message && <p>{message}</p>}  

    <p>  
      Already have an account?{" "}  
      <Link to="/login">Login</Link>  
    </p>  
  </div>  
</div>

);
}

/* =========================================================
INSTITUTION DASHBOARD
========================================================= */

function Dashboard() {
const navigate = useNavigate();

const [institution, setInstitution] = useState(null);
const [isSuperAdmin, setIsSuperAdmin] = useState(false);

const [departmentCount, setDepartmentCount] = useState(0);
const [programmeCount, setProgrammeCount] = useState(0);
const [staffCount, setStaffCount] = useState(0);
const [studentCount, setStudentCount] = useState(0);
const [classCount, setClassCount] = useState(0);
const [academicUnitCount, setAcademicUnitCount] = useState(0);

const [loading, setLoading] = useState(true);
const [message, setMessage] = useState("");

useEffect(() => {
let cancelled = false;

const loadDashboard = async () => {  
  try {  
    const {  
      data: { user },  
      error: userError,  
    } = await supabase.auth.getUser();  

    if (userError) throw userError;  

    // No logged-in user.  
    if (!user) {  
      navigate("/login");  
      return;  
    }  

    // Check Super Admin.  
    const {  
      data: superAdmin,  
      error: superAdminError,  
    } = await supabase  
      .from("super_admins")  
      .select("id, is_active")  
      .eq("user_id", user.id)  
      .eq("is_active", true)  
      .maybeSingle();  

    if (superAdminError) {  
      console.error(  
        "Super Admin check error:",  
        superAdminError  
      );  
    }  

    if (!cancelled) {  
      setIsSuperAdmin(!!superAdmin);  
    }  

    // Load active institution membership.  
    const { data, error } = await supabase  
      .from("institution_members")  
      .select(`  
        institution_id,  
        role,  
        institutions (  
          id,  
          name,  
          institution_type,  
          email,  
          phone,  
          address,  
          logo_url  
        )  
      `)  
      .eq("user_id", user.id)  
      .eq("is_active", true)  
      .eq("role", "institution_admin")  
      .limit(1)  
      .maybeSingle();  

    if (error) throw error;  

    // A Super Admin may not belong to an institution.  
    if (!data || !data.institutions) {  
      if (!superAdmin) {  
        setMessage(  
          "No institution was found for this account."  
        );  
      }  

      setLoading(false);  
      return;  
    }  

    if (cancelled) return;  

    setInstitution(data.institutions);  

    const institutionId = data.institution_id;  

    const [  
      departmentsResult,  
      programmesResult,  
      staffResult,  
      studentsResult,  
      classesResult,  
      academicUnitsResult,  
    ] = await Promise.all([  
      supabase  
        .from("departments")  
        .select("*", { count: "exact", head: true })  
        .eq("institution_id", institutionId),  

      supabase  
        .from("programmes")  
        .select("*", { count: "exact", head: true })  
        .eq("institution_id", institutionId),  

      supabase  
        .from("staff")  
        .select("*", { count: "exact", head: true })  
        .eq("institution_id", institutionId),  

      supabase  
        .from("students")  
        .select("*", { count: "exact", head: true })  
        .eq("institution_id", institutionId),  

      supabase  
        .from("classes")  
        .select("*", { count: "exact", head: true })  
        .eq("institution_id", institutionId),  

      supabase  
        .from("academic_units")  
        .select("*", { count: "exact", head: true })  
        .eq("institution_id", institutionId),  
    ]);  

    const results = [  
      departmentsResult,  
      programmesResult,  
      staffResult,  
      studentsResult,  
      classesResult,  
      academicUnitsResult,  
    ];  

    const failedResult = results.find(  
      (result) => result.error  
    );  

    if (failedResult) {  
      throw failedResult.error;  
    }  

    if (cancelled) return;  

    setDepartmentCount(departmentsResult.count || 0);  
    setProgrammeCount(programmesResult.count || 0);  
    setStaffCount(staffResult.count || 0);  
    setStudentCount(studentsResult.count || 0);  
    setClassCount(classesResult.count || 0);  
    setAcademicUnitCount(academicUnitsResult.count || 0);  
  } catch (error) {  
    console.error("Dashboard loading error:", error);  

    if (!cancelled) {  
      setMessage(  
        error.message || "Failed to load dashboard."  
      );  
    }  
  } finally {  
    if (!cancelled) {  
      setLoading(false);  
    }  
  }  
};  

loadDashboard();  

return () => {  
  cancelled = true;  
};

}, [navigate]);

const handleLogout = async () => {
await supabase.auth.signOut();
navigate("/login");
};

if (loading) {
return (
<div className="dashboard-loading">
<h2>Loading EMP...</h2>
</div>
);
}

return (
<div className="dashboard-layout">
<aside className="dashboard-sidebar">
<div className="sidebar-logo">
<h2>EMP</h2>
<p>Education Management</p>
</div>

<div className="sidebar-institution">  
      {institution && (  
        <>  
          <strong>{institution.name}</strong>  

          <small>{institution.institution_type}</small>  
        </>  
      )}  
    </div>  

    <nav className="sidebar-menu">  
      <Link to="/dashboard">🏠 Dashboard</Link>  

      <Link to="/dashboard">🏫 Institution</Link>  

      <Link to="/dashboard/departments">  
        🏢 Departments  
      </Link>  

     {["university", "college", "tvet"].includes(

institution?.institution_type?.toLowerCase()
) && (

  <Link to="/dashboard/programmes">  
    📚 Programmes  
  </Link>  
)}  <Link to="/dashboard/classes">  
        🏫 Classes  
      </Link>  

     {["primary", "junior", "junior_secondary", "secondary"].includes(

institution?.institution_type?.toLowerCase()
) ? (

  <Link to="/dashboard/subjects">  
    📚 Subjects & Learning Areas  
  </Link>  
) : (  
  <Link to="/dashboard/academic-units">  
    📖 Academic Units  
  </Link>  
)}  <Link to="/dashboard/staff">  
        🧑‍🏫 Staff  
      </Link>  

      <Link to="/dashboard/teaching-assignments">  
        📚 Teaching Assignments  
      </Link>  

      <Link to="/dashboard/students">  
        👨‍🎓 Students  
      </Link>  

      <Link to="/staff">🧑‍🏫 Staff Portal</Link>  

      <Link to="/dashboard/results">📝 Results</Link>  

      <Link to="/dashboard/result-processing">  
        ⚙️ Result Processing  
      </Link>  

      <Link to="/dashboard/student-results">  
        📊 Student Results  
      </Link>  

      <Link to="/dashboard/grading-scales">  
        🎓 Grading Scales  
      </Link>  

      <Link to="/dashboard/settings">⚙️ Settings</Link>  

      <Link  
        to="/dashboard/help-support"  
        className="sidebar-link"  
      >  
        <span className="sidebar-icon" aria-hidden="true">  
          🎧  
        </span>  
        <span>Help & Support</span>  
      </Link>  

      <Link to="/dashboard/my-support-tickets">  
        🎫 My Support Tickets  
      </Link>  

      {isSuperAdmin && (  
        <>  
          <div  
            style={{  
              margin: "18px 0 8px",  
              padding: "0 12px",  
              fontSize: "11px",  
              fontWeight: "700",  
              letterSpacing: "1px",  
              opacity: 0.6,  
            }}  
          >  
            PLATFORM  
          </div>  

          <Link to="/dashboard/super-admin">  
            👑 Super Admin  
          </Link>  
        </>  
      )}  
    </nav>  

    <button  
      className="sidebar-logout"  
      onClick={handleLogout}  
    >  
      🚪 Logout  
    </button>  
  </aside>  

  <main className="dashboard-main">  
    {/* Dashboard header with notification bell */}  
    <header className="dashboard-header">  
      <div>  
        <h1>Dashboard</h1>  

        <p>  
          Welcome back to your institution management system.  
        </p>  
      </div>  

      <div  
        style={{  
          display: "flex",  
          alignItems: "center",  
          gap: "16px",  
        }}  
      >  
        <NotificationBell />  

        <div className="admin-profile">  
          👤 Institution Admin  
        </div>  
      </div>  
    </header>  

    {message && (  
      <div className="dashboard-message">  
        {message}  
      </div>  
    )}  

    {institution && (  
      <>  
        <section className="institution-card">  
          <div>  
            <p>Institution</p>  
            <h2>{institution.name}</h2>  
            <span>{institution.institution_type}</span>  
          </div>  

          <div>  
            <p>Email</p>  
            <strong>{institution.email || "—"}</strong>  
          </div>  

          <div>  
            <p>Phone</p>  
            <strong>{institution.phone || "—"}</strong>  
          </div>  
        </section>  
        <section className="dashboard-stats">

{/* Departments — available to all institution types */}

  <div className="stat-card">  
    <span>🏢</span>  
    <h3>Departments</h3>  
    <strong>{departmentCount}</strong>  
  </div>  {/* Programmes — universities, colleges and TVETs only */}
{["university", "college", "tvet"].includes(
institution?.institution_type?.toLowerCase()
) && (
<div className="stat-card">
<span>📚</span>
<h3>Programmes</h3>
<strong>{programmeCount}</strong>
</div>
)}

{/* Staff */}

  <div className="stat-card">  
    <span>🧑‍🏫</span>  
    <h3>Staff</h3>  
    <strong>{staffCount}</strong>  
  </div>  {/* Students */}

  <div className="stat-card">  
    <span>👨‍🎓</span>  
    <h3>Students</h3>  
    <strong>{studentCount}</strong>  
  </div>  {/* Classes */}

  <div className="stat-card">  
    <span>🏫</span>  
    <h3>Classes</h3>  
    <strong>{classCount}</strong>  
  </div>  {/* Subjects for schools; Academic Units for higher institutions */}
{["primary", "school", "junior", "junior_secondary", "secondary"].includes(
institution?.institution_type?.toLowerCase()
) ? (
<div className="stat-card">
<span>📖</span>
<h3>Subjects</h3>
<strong>{academicUnitCount}</strong>
</div>
) : (
<div className="stat-card">
<span>📖</span>
<h3>Academic Units</h3>
<strong>{academicUnitCount}</strong>
</div>
)}

</section>  
            <section className="dashboard-welcome">  
              <h2>Manage Your Institution</h2>  <p>  
            Use the navigation menu to manage your institution,  
            staff, students, classes, academic units and results.  
          </p>  
        </section>  
      </>  
    )}  
  </main>  
</div>

);
}

/* =========================================================
SUPER ADMIN PROTECTED ROUTE
========================================================= */

function SuperAdminProtectedRoute({ children }) {
const navigate = useNavigate();

const [checking, setChecking] = useState(true);
const [authorized, setAuthorized] = useState(false);

useEffect(() => {
let cancelled = false;

const checkAccess = async () => {  
  try {  
    const {  
      data: { user },  
      error: userError,  
    } = await supabase.auth.getUser();  

    if (userError) throw userError;  

    if (!user) {  
      navigate("/login", { replace: true });  
      return;  
    }  

    const { data: superAdmin, error } = await supabase  
      .from("super_admins")  
      .select("id, is_active")  
      .eq("user_id", user.id)  
      .eq("is_active", true)  
      .maybeSingle();  

    if (error) throw error;  

    if (!superAdmin) {  
      navigate("/dashboard", { replace: true });  
      return;  
    }  

    if (!cancelled) {  
      setAuthorized(true);  
    }  
  } catch (error) {  
    console.error(  
      "Super Admin authorization error:",  
      error  
    );  

    if (!cancelled) {  
      navigate("/login", { replace: true });  
    }  
  } finally {  
    if (!cancelled) {  
      setChecking(false);  
    }  
  }  
};  

checkAccess();  

return () => {  
  cancelled = true;  
};

}, [navigate]);

if (checking) {
return (
<div className="dashboard-loading">
<h2>Checking access...</h2>
</div>
);
}

if (!authorized) {
return null;
}

return children;
}

/* =========================================================
APP ROUTES
========================================================= */

function App() {
return (
<BrowserRouter basename="/education-management-platform">
<Routes>
{/* Public pages */}
<Route path="/" element={<Home />} />
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />

{/* Staff pages */}  
    <Route  
      path="/staff/accept-invite"  
      element={<StaffAcceptInvite />}  
    />  
    <Route path="/staff" element={<StaffPortal />} />  
    <Route path="/staff/marks" element={<StaffMarks />} />  

    {/* Institution dashboard */}  
    <Route path="/dashboard" element={<Dashboard />} />  

    <Route  
      path="/dashboard/departments"  
      element={<Departments />}  
    />  
    <Route  
      path="/dashboard/programmes"  
      element={<Programmes />}  
    />  
    <Route  
      path="/dashboard/staff"  
      element={<Staff />}  
    />  
    <Route  
      path="/dashboard/teaching-assignments"  
      element={<TeachingAssignments />}  
    />  
    <Route  
      path="/dashboard/students"  
      element={<Students />}  
    />  
    <Route  
      path="/dashboard/classes"  
      element={<Classes />}  
    />  
    <Route  
      path="/dashboard/academic-units"  
      element={<AcademicUnits />}  
    />  
    <Route path="/dashboard/subjects" element={<Subjects />} />  
    <Route  
      path="/dashboard/results"  
      element={<Results />}  
    />  
    <Route  
      path="/dashboard/grading-scales"  
      element={<GradingScales />}  
    />  
    <Route  
      path="/dashboard/result-processing"  
      element={<ResultProcessing />}  
    />  
    <Route  
      path="/dashboard/student-results"  
      element={<StudentResults />}  
    />  
    <Route  
      path="/dashboard/settings"  
      element={<Settings />}  
    />  
    <Route  
      path="/dashboard/help-support"  
      element={<HelpSupport />}
/>
<Route
path="/dashboard/my-support-tickets"
element={<MySupportTickets />}
/>

{/* Super Admin */}  
    <Route  
      path="/dashboard/super-admin"  
      element={  
        <SuperAdminProtectedRoute>  
          <SuperAdminLayout />  
        </SuperAdminProtectedRoute>  
      }  
    >  
      <Route  
        index  
        element={<SuperAdminDashboard />}  
      />  
      <Route  
        path="institutions"  
        element={<Institutions />}  
      />  
      <Route  
        path="users"  
        element={<Users />}  
      />  
      <Route  
        path="analytics"  
        element={<Analytics />}  
      />  
      <Route  
        path="activity"  
        element={<ActivityLogs />}  
      />  
      <Route  
        path="support-tickets"  
        element={<SupportTickets />}  
      />  
      <Route  
        path="settings"  
        element={<PlatformSettings />}  
      />  
      
  </Route>  
  </Routes>  
</BrowserRouter>  
  );  
  }  

  export default App;