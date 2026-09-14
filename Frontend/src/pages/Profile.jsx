import React, { useState, useEffect, useRef } from "react";
import {
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Send,
  Bell,
  BellOff,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  Lock,
  Pencil,
  Loader2,
  AlertCircle,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Cookies from "js-cookie";
import api from "../lib/api"; // ← adjust to your project path
import { updateProfile } from "../redux/slices/profile/profileSlice";
import { useDispatch, useSelector } from "react-redux";

/* ─── Design tokens ───────────────────────────────────────────────────────── */
const T = {
  bg: "#F1F5F9",
  card: "#FFFFFF",
  border: "#E2E8F0",
  border2: "#CBD5E1",
  accent: "#2563EB",
  accentL: "#EFF6FF",
  accentB: "#BFDBFE",
  green: "#059669",
  greenL: "#ECFDF5",
  greenB: "#6EE7B7",
  red: "#DC2626",
  text: "#0F172A",
  muted: "#64748B",
  muted2: "#94A3B8",
  disabled: "#F8FAFC",
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const getInitials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/* ─── FieldLabel ──────────────────────────────────────────────────────────── */
const FieldLabel = ({ children, required }) => (
  <label
    style={{
      display: "block",
      fontSize: "11px",
      fontWeight: 600,
      letterSpacing: "0.6px",
      textTransform: "uppercase",
      color: T.muted,
      marginBottom: "6px",
    }}
  >
    {children}
    {required && <span style={{ color: T.red, marginLeft: "3px" }}>*</span>}
  </label>
);

/* ─── Controlled editable input ───────────────────────────────────────────── */
const EditInput = ({
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  right,
  disabled,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: disabled ? T.disabled : T.card,
        border: `1px solid ${focused ? T.accent : T.border2}`,
        borderRadius: "10px",
        padding: "0 12px",
        gap: "10px",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: focused ? `0 0 0 3px ${T.accentB}55` : "none",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {Icon && (
        <Icon
          size={15}
          color={focused ? T.accent : T.muted2}
          style={{ flexShrink: 0, transition: "color 0.15s" }}
        />
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          fontSize: "13px",
          color: T.text,
          padding: "10px 0",
          fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
      {right}
    </div>
  );
};

/* ─── Read-only field ─────────────────────────────────────────────────────── */
const ReadField = ({ icon: Icon, value }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      background: T.disabled,
      border: `1px solid ${T.border}`,
      borderRadius: "10px",
      padding: "10px 12px",
    }}
  >
    {Icon && <Icon size={15} color={T.muted2} style={{ flexShrink: 0 }} />}
    <span style={{ fontSize: "13px", color: T.muted, flex: 1 }}>
      {value || "—"}
    </span>
    <Lock size={12} color={T.muted2} />
  </div>
);

/* ─── Status pill ─────────────────────────────────────────────────────────── */
const StatusPill = ({ on, label }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      padding: "3px 10px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: 600,
      background: on ? T.greenL : T.disabled,
      color: on ? T.green : T.muted,
      border: `1px solid ${on ? T.greenB : T.border}`,
    }}
  >
    {on ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
    {label}
  </span>
);

/* ─── Section head ────────────────────────────────────────────────────────── */
const SectionHead = ({ title, subtitle }) => (
  <div style={{ marginBottom: "16px" }}>
    <div
      style={{
        fontSize: "13px",
        fontWeight: 700,
        color: T.text,
        marginBottom: "2px",
      }}
    >
      {title}
    </div>
    {subtitle && (
      <div style={{ fontSize: "12px", color: T.muted }}>{subtitle}</div>
    )}
  </div>
);

/* ─── Preference row ──────────────────────────────────────────────────────── */
const PrefRow = ({ icon: Icon, label, sub, on }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 14px",
      background: T.bg,
      borderRadius: "10px",
      border: `1px solid ${T.border}`,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          background: on ? T.accentL : T.disabled,
          border: `1px solid ${on ? T.accentB : T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={15} color={on ? T.accent : T.muted2} />
      </div>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 500, color: T.text }}>
          {label}
        </div>
        <div style={{ fontSize: "11px", color: T.muted }}>{sub}</div>
      </div>
    </div>
    <StatusPill on={on} label={on ? "Enabled" : "Disabled"} />
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const Profile = () => {
  // Read logged-in user ID from cookie (same cookie your auth sets)
  const userId = Cookies.get("userId");
  const dispatch = useDispatch();
  const profileUser = useSelector((state) => state.profile.user);
  // Remote state
  const [user, setUser] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const fileRef = useRef();

  const [profilePreview, setProfilePreview] = useState(null);
  const [profileFile, setProfileFile] = useState(null);
  // Editable form — only the 3 fields the backend allows users to self-edit:
  // name, telegramUsername, password
  const [form, setForm] = useState({
    name: "",
    // telegramUsername: "",
    password: "",
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveHover, setSaveHover] = useState(false);

  // ── Fetch user on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setFetchError("No user session found. Please log in again.");
      setFetchLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        setFetchLoading(true);
        setFetchError(null);
        // GET /api/v1/users/:id → { success: true, data: { ...user } }
        const res = await api.get(`/users/${userId}`);
        const data = res.data?.data || res.data;
        setUser(data);
        // Seed editable fields
        setForm({
          name: data.name || "",
          //   telegramUsername: data.telegramUsername || "",
          password: "",
        });
        setProfilePreview(
          data.profilePhoto.startsWith("http")
            ? data.profilePhoto
            : `${import.meta.env.VITE_API_BASE_URL}${data.profilePhoto}`,
        );
      } catch (err) {
        const msg = err?.response?.data?.message || "Failed to load profile";
        setFetchError(msg);
        toast.error(msg);
      } finally {
        setFetchLoading(false);
      }
    };

    fetchUser();
  }, [userId]);
  useEffect(() => {
    if (profileUser) {
      setUser(profileUser);

      setForm((prev) => ({
        ...prev,
        name: profileUser.name || "",
      }));

      if (profileUser.profilePhoto) {
        setProfilePreview(
          profileUser.profilePhoto.startsWith("http")
            ? profileUser.profilePhoto
            : `${import.meta.env.VITE_API_BASE_URL}${profileUser.profilePhoto}`,
        );
      }
    }
  }, [profileUser]);
  const handleProfileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }
    setProfileFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  // ── Field handler ────────────────────────────────────────────────────────
  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const res = await dispatch(
      updateProfile({
        form,
        profileFile,
        currentUser: user,
      }),
    );

    if (updateProfile.fulfilled.match(res)) {
      toast.success("Profile updated successfully");

      setForm((prev) => ({
        ...prev,
        password: "",
      }));

      setProfileFile(null);
    } else {
      toast.error(res.payload);
    }
  };

  // ── Derived display values (populated by backend) ────────────────────────
  const displayDept = Array.isArray(user?.department)
    ? user.department.map((d) => d?.name || d).join(", ")
    : user?.department?.name || user?.department || "—";

  const displayRole = user?.role?.name || user?.role || "—";
  const displayShift = user?.assignShift?.name || user?.assignShift || null;
  const displayManager = user?.reportingManager?.name || null;

  /* ── Loading ──────────────────────────────────────────────────────────── */
  if (fetchLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Loader2
            size={28}
            color={T.accent}
            style={{ animation: "spin 0.8s linear infinite" }}
          />
          <span style={{ fontSize: "13px", color: T.muted }}>
            Loading your profile…
          </span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Error ────────────────────────────────────────────────────────────── */
  if (fetchError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          padding: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: "18px",
            padding: "40px",
            textAlign: "center",
            maxWidth: "400px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <AlertCircle
            size={32}
            color={T.red}
            style={{ marginBottom: "12px" }}
          />
          <div
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: T.text,
              marginBottom: "6px",
            }}
          >
            Couldn't load profile
          </div>
          <div
            style={{ fontSize: "13px", color: T.muted, marginBottom: "20px" }}
          >
            {fetchError}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: T.accent,
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ── Main render ──────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        padding: "28px 24px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: ${T.muted2}; font-size: 13px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to   { transform: rotate(360deg); } }
        .profile-card                { animation: fadeUp 0.3s ease both; }
        .profile-card:nth-child(2)   { animation-delay: 0.05s; }
        .profile-card:nth-child(3)   { animation-delay: 0.10s; }
        .profile-card:nth-child(4)   { animation-delay: 0.15s; }
      `}</style>

      <div style={{ margin: "0 auto" }}>
        {/* ── Page header ────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: T.text,
                margin: 0,
                letterSpacing: "-0.5px",
              }}
            >
              My Profile
            </h1>
            <p style={{ fontSize: "13px", color: T.muted, marginTop: "2px" }}>
              Manage your personal information and preferences
            </p>
          </div>
          <Link
            to="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: T.accent,
              textDecoration: "none",
              padding: "8px 14px",
              background: T.accentL,
              border: `1px solid ${T.accentB}`,
              borderRadius: "10px",
            }}
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>
        </div>

        {/* ── Banner card ────────────────────────────────────────────── */}
        <div
          className="profile-card"
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: "18px",
            padding: "24px",
            display: "flex",
            alignItems: "flex-start",
            gap: "24px",
            marginBottom: "16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            flexWrap: "wrap",
          }}
        >
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                  flexShrink: 0,
                }}
              >
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "20px",
                    cursor: "pointer",
                    background: profilePreview
                      ? "transparent"
                      : `linear-gradient(135deg,${T.accent},#4F46E5)`,
                    border: `2px dashed ${profilePreview ? T.border2 : T.accentB}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    position: "relative",
                    transition: "all 0.2s",
                  }}
                  title="Click to upload logo"
                >
                  {profilePreview ? (
                    <img
                      src={profilePreview}
                      alt="Logo"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <Image
                        size={24}
                        color="#fff"
                        style={{ marginBottom: "4px" }}
                      />
                      <div
                        style={{
                          fontSize: "10px",
                          color: "rgba(255,255,255,0.8)",
                          fontWeight: 600,
                        }}
                      >
                        UPLOAD
                      </div>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      transition: "opacity 0.2s",
                      borderRadius: "18px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                  >
                    <Upload size={20} color="#fff" />
                  </div>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleProfileChange}
                />
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: T.accent,
                      background: T.accentL,
                      border: `1px solid ${T.accentB}`,
                      borderRadius: "7px",
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Change
                  </button>
                  {/* {logoPreview && (
                  <button
                    onClick={() => {
                      setLogoPreview(null);
                      setLogoFile(null);
                    }}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: T.red,
                      background: T.redL,
                      border: `1px solid ${T.red}30`,
                      borderRadius: "7px",
                      padding: "4px 10px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Remove
                  </button>
                )} */}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: T.muted2,
                    textAlign: "center",
                  }}
                >
                  PNG, JPG, SVG
                  <br />
                  Max 2 MB
                </div>
              </div>
            </div>
          </div>

          {/* Identity */}
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div
              style={{
                fontSize: "20px",
                display: "flex",
                alignItems: "flex-start",
                fontWeight: 800,
                color: T.text,
                letterSpacing: "-0.5px",
              }}
            >
              {user?.name}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "6px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "20px",
                  background: T.accentL,
                  color: T.accent,
                  border: `1px solid ${T.accentB}`,
                }}
              >
                {displayRole}
              </span>
              {Array.isArray(user?.department) &&
                user?.department &&
                user?.department.length > 0 && (
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      padding: "3px 10px",
                      borderRadius: "20px",
                      background: T.bg,
                      color: T.muted,
                      border: `1px solid ${T.border}`,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Building2 size={11} /> {displayDept}
                  </span>
                )}
              <StatusPill
                on={user?.isActive}
                label={user?.isActive ? "Active" : "Inactive"}
              />
            </div>
            {/* Extra chips: employee code, shift, reporting manager */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "8px",
                flexWrap: "wrap",
              }}
            >
              {user?.employeeCode && (
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    borderRadius: "6px",
                    padding: "2px 8px",
                    color: T.muted,
                  }}
                >
                  {user.employeeCode}
                </span>
              )}
              {displayShift && (
                <span
                  style={{
                    fontSize: "11px",
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    borderRadius: "6px",
                    padding: "2px 8px",
                    color: T.muted,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Clock size={10} /> {displayShift}
                </span>
              )}
              {displayManager && (
                <span
                  style={{
                    fontSize: "11px",
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    borderRadius: "6px",
                    padding: "2px 8px",
                    color: T.muted,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <User size={10} /> Reports to: {displayManager}
                </span>
              )}
            </div>
          </div>

          {/* Date tiles */}
          <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
            {[
              {
                label: "Member since",
                value: fmtDate(user?.createdAt),
                icon: Calendar,
              },
              {
                label: "Last updated",
                value: fmtDate(user?.updatedAt),
                icon: Clock,
              },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                style={{
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: "12px",
                  padding: "10px 14px",
                  textAlign: "center",
                  minWidth: "110px",
                }}
              >
                <Icon
                  size={13}
                  color={T.muted2}
                  style={{ marginBottom: "4px" }}
                />
                <div
                  style={{ fontSize: "12px", fontWeight: 700, color: T.text }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: T.muted2,
                    marginTop: "1px",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Personal info card ──────────────────────────────────────── */}
        <div
          className="profile-card"
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: "18px",
            padding: "24px",
            marginBottom: "16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "20px",
            }}
          >
            <SectionHead
              title="Personal Information"
              subtitle="Edit the fields below and save your changes"
            />
            {/* <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: T.muted,
              }}
            >
              <Pencil size={12} /> Blue border = editable
            </div> */}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {/* Editable: name */}
            <div>
              <FieldLabel required>Full Name</FieldLabel>
              <EditInput
                icon={User}
                value={form.name}
                onChange={handleChange("name")}
                placeholder="Enter your full name"
              />
            </div>

            {/* Editable: telegram */}
            {/* <div>
              <FieldLabel>Telegram Username</FieldLabel>
              <EditInput
                icon={Send}
                value={form.telegramUsername}
                onChange={handleChange("telegramUsername")}
                placeholder="@username"
              />
            </div> */}

            {/* Editable: password */}
            <div>
              <FieldLabel>New Password</FieldLabel>
              <EditInput
                icon={Lock}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange("password")}
                placeholder="Leave blank to keep current"
                right={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      color: T.muted2,
                    }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
            </div>

            {/* Read-only: email */}
            <div>
              <FieldLabel>Email Address</FieldLabel>
              <ReadField icon={Mail} value={user?.email} />
            </div>

            {/* Read-only: phone */}
            <div>
              <FieldLabel>Phone Number</FieldLabel>
              <ReadField icon={Phone} value={user?.phone} />
            </div>

            {/* Read-only: secondary email */}
            <div>
              <FieldLabel>Alternative Email</FieldLabel>
              <ReadField icon={Mail} value={user?.secondaryEmail} />
            </div>

            {/* Read-only: department */}
            <div>
              <FieldLabel>Department</FieldLabel>
              <ReadField icon={Building2} value={displayDept} />
            </div>

            {/* Read-only: role */}
            <div>
              <FieldLabel>Role</FieldLabel>
              <ReadField icon={Shield} value={displayRole} />
            </div>
          </div>

          {/* Save row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: `1px solid ${T.border}`,
            }}
          >
            <div style={{ fontSize: "12px", color: T.muted, flex: 1 }}>
              🔒 Email, phone, department, role and shift can only be changed by
              an admin
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              onMouseEnter={() => setSaveHover(true)}
              onMouseLeave={() => setSaveHover(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: saving
                  ? T.muted2
                  : saveHover
                    ? "#1D4ED8"
                    : T.accent,
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                boxShadow:
                  saveHover && !saving
                    ? `0 4px 16px ${T.accent}55`
                    : `0 2px 8px ${T.accent}30`,
                transform: saveHover && !saving ? "translateY(-1px)" : "none",
                transition: "all 0.15s",
              }}
            >
              {saving ? (
                <>
                  <Loader2
                    size={15}
                    style={{ animation: "spin 0.8s linear infinite" }}
                  />{" "}
                  Saving…
                </>
              ) : (
                <>
                  <Save size={15} /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Notification preferences card ───────────────────────────── */}
        <div
          className="profile-card"
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: "18px",
            padding: "24px",
            marginBottom: "16px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <SectionHead
            title="Notification Preferences"
            subtitle="These settings are managed by your administrator"
          />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <PrefRow
              icon={Bell}
              label="Email Notifications"
              sub="Receive task updates and alerts via email"
              on={!!user?.isEmailNotificationEnabled}
            />
            {/* <PrefRow
              icon={user?.secondaryEmail ? Bell : BellOff}
              label="Alternative Email Notifications"
              sub="Receive notifications on your secondary email address"
              on={!!user?.secondaryEmail}
            /> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
