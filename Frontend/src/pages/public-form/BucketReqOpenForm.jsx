import React, { useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  MapPin,
  AlignLeft,
  Type,
  Zap,
  ArrowRight,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_BASE_URL;

/* ── Design tokens ──────────────────────────────────────────────────────── */
const T = {
  bg: "#F1F5F9",
  card: "#FFFFFF",
  surf: "#F8FAFC",
  text: "#0F172A",
  text2: "#334155",
  muted: "#64748B",
  muted2: "#94A3B8",
  border: "#E2E8F0",
  border2: "#CBD5E1",
  accent: "#2563EB",
  accentL: "#EFF6FF",
  accentB: "#BFDBFE",
  green: "#059669",
  greenL: "#ECFDF5",
  greenB: "#A7F3D0",
  red: "#DC2626",
  redL: "#FEF2F2",
  redB: "#FECACA",
};

/* ── Shared atoms ────────────────────────────────────────────────────────── */
const FField = ({
  label,
  required,
  icon: Icon,
  iconColor,
  error,
  children,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: T.muted,
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {Icon && (
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 5,
            background: `${iconColor}15`,
            border: `1px solid ${iconColor}30`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={10} color={iconColor} />
        </span>
      )}
      {label}
      {required && <span style={{ color: T.red }}>*</span>}
    </label>
    {children}
    {error && (
      <span style={{ fontSize: 11, color: T.red, fontWeight: 600 }}>
        ⚠ {error}
      </span>
    )}
  </div>
);

const inputStyle = (error, focused) => ({
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 14px",
  borderRadius: 10,
  border: `1px solid ${error ? T.red : focused ? T.accent : T.border2}`,
  boxShadow: focused ? `0 0 0 3px ${error ? T.redB : T.accentB}55` : "none",
  outline: "none",
  fontSize: 14,
  color: T.text,
  background: T.card,
  fontFamily: "inherit",
  transition: "all 0.15s",
});

const FInput = ({
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  autoFocus,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={inputStyle(error, focused)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
};

const FTextarea = ({ value, onChange, placeholder, rows = 4, error }) => {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle(error, focused), resize: "vertical" }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════════════════ */
export default function BucketReqOpenForm() {
  // Step 1 — verify employee
  const [empCode, setEmpCode] = useState("");
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Step 2 — fill form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Inline errors
  const [errors, setErrors] = useState({});

  /* ── Verify employee ───────────────────────────────────────────────────── */
  const handleVerify = async () => {
    if (!empCode.trim()) {
      setErrors({ empCode: "Employee code is required." });
      return;
    }
    try {
      setVerifying(true);
      setErrors({});
      const res = await axios.post(`${API}/open-forms/verify-user`, {
        employeeCode: empCode.trim(),
      });
      setVerifiedUser(res.data.data);
      toast.success(`Welcome, ${res.data.data.name}!`);
    } catch (err) {
      setErrors({
        empCode: err?.response?.data?.message || "Employee not found.",
      });
    } finally {
      setVerifying(false);
    }
  };

  /* ── Validate form ─────────────────────────────────────────────────────── */
  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Title is required.";
    if (!description.trim()) e.description = "Description is required.";
    if (!location.trim()) e.location = "Location is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Submit ────────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!validate()) return;

    // Confirm toast
    toast.custom((t) => (
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: "20px 22px",
          width: 340,
          boxShadow: "0 10px 30px rgba(15,23,42,0.1)",
          fontFamily: "inherit",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: T.text,
            marginBottom: 6,
          }}
        >
          Submit Request?
        </div>
        <div
          style={{
            fontSize: 13,
            color: T.muted,
            marginBottom: 18,
            lineHeight: 1.5,
          }}
        >
          Your task request will be sent to the team for review.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            onClick={() => toast.dismiss(t)}
            style={{
              border: `1px solid ${T.border}`,
              background: T.surf,
              color: T.text2,
              padding: "8px 16px",
              borderRadius: 9,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t);
              try {
                setSubmitting(true);
                await axios.post(`${API}/task-buckets-req/submit`, {
                  title: title.trim(),
                  description: description.trim(),
                  location: location.trim(),
                  employeeCode: empCode.trim(),
                  submittedBy: verifiedUser?._id,
                });
                setSubmitted(true);
                toast.success("Request submitted!");
              } catch (err) {
                toast.error(
                  err?.response?.data?.message || "Submission failed.",
                );
              } finally {
                setSubmitting(false);
              }
            }}
            style={{
              border: "none",
              background: T.accent,
              color: "#fff",
              padding: "8px 16px",
              borderRadius: 9,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 13,
            }}
          >
            Yes, Submit
          </button>
        </div>
      </div>
    ));
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        padding: "40px 16px",
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        input::placeholder,textarea::placeholder{color:#94A3B8}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pop{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* ── SUCCESS STATE ─────────────────────────────────────────────── */}
        {submitted ? (
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 24,
              padding: "60px 40px",
              textAlign: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
              animation: "pop 0.3s ease",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                background: T.greenL,
                border: `1px solid ${T.greenB}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <CheckCircle2 size={34} color={T.green} />
            </div>
            <h2
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: T.text,
                margin: "0 0 8px",
              }}
            >
              Request Submitted!
            </h2>
            <p
              style={{
                fontSize: 14,
                color: T.muted,
                margin: "0 0 28px",
                lineHeight: 1.6,
              }}
            >
              Your task request has been sent to the team for review.
              <br />
              You'll be notified once it's processed.
            </p>
            <div
              style={{
                background: T.accentL,
                border: `1px solid ${T.accentB}`,
                borderRadius: 12,
                padding: "12px 18px",
                display: "inline-block",
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.accent,
                  textTransform: "uppercase",
                  letterSpacing: "0.7px",
                  marginBottom: 3,
                }}
              >
                Submitted by
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                {verifiedUser?.name}
              </div>
              <div style={{ fontSize: 12, color: T.muted }}>
                EMP: {verifiedUser?.employeeCode}
              </div>
            </div>
            <br />
            <button
              onClick={() => {
                setSubmitted(false);
                setTitle("");
                setDescription("");
                setLocation("");
                setErrors({});
              }}
              style={{
                background: T.accent,
                border: "none",
                color: "#fff",
                padding: "11px 24px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Submit Another Request
            </button>
          </div>
        ) : (
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 24,
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.07)",
              animation: "fadeUp 0.3s ease",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg,#1E3A8A,#2563EB)",
                padding: "32px 36px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileText size={24} color="#fff" />
                </div>
                <div>
                  <h1
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#fff",
                      margin: 0,
                      letterSpacing: "-0.3px",
                    }}
                  >
                    Task Request
                  </h1>
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.75)",
                      margin: "4px 0 0",
                    }}
                  >
                    Submit a task for team review
                  </p>
                </div>
              </div>

              {/* Step indicator */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 22,
                }}
              >
                {[
                  { n: 1, label: "Verify Identity" },
                  { n: 2, label: "Fill Details" },
                ].map(({ n, label }, i) => {
                  const done = verifiedUser && n === 1;
                  const current =
                    (n === 1 && !verifiedUser) || (n === 2 && verifiedUser);
                  return (
                    <React.Fragment key={n}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: done
                              ? "#fff"
                              : current
                                ? "rgba(255,255,255,0.9)"
                                : "rgba(255,255,255,0.25)",
                            color:
                              done || current
                                ? T.accent
                                : "rgba(255,255,255,0.6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {done ? "✓" : n}
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: current ? "#fff" : "rgba(255,255,255,0.55)",
                          }}
                        >
                          {label}
                        </span>
                      </div>
                      {i === 0 && (
                        <div
                          style={{
                            flex: 1,
                            height: 1,
                            background: "rgba(255,255,255,0.25)",
                            maxWidth: 40,
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "30px 36px 36px" }}>
              {/* ── STEP 1: Employee verification ──────────────────────── */}
              {!verifiedUser ? (
                <div style={{ animation: "fadeUp 0.25s ease" }}>
                  <div style={{ textAlign: "center", marginBottom: 28 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 16,
                        background: T.accentL,
                        border: `1px solid ${T.accentB}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 14px",
                      }}
                    >
                      <ShieldCheck size={26} color={T.accent} />
                    </div>
                    <h2
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: T.text,
                        margin: "0 0 6px",
                      }}
                    >
                      Verify Your Identity
                    </h2>
                    <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
                      Enter your employee code to proceed
                    </p>
                  </div>

                  <FField
                    label="Employee Code"
                    required
                    error={errors.empCode}
                    icon={ShieldCheck}
                    iconColor={T.accent}
                  >
                    <FInput
                      value={empCode}
                      onChange={(e) => {
                        setEmpCode(e.target.value);
                        setErrors({});
                      }}
                      placeholder="e.g. emp001"
                      autoFocus
                      error={errors.empCode}
                    />
                  </FField>

                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    style={{
                      marginTop: 20,
                      width: "100%",
                      border: "none",
                      background: verifying ? T.border2 : T.accent,
                      color: verifying ? T.muted : "#fff",
                      padding: "13px",
                      borderRadius: 11,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: verifying ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      transition: "all 0.15s",
                    }}
                  >
                    {verifying ? (
                      <>
                        <Loader2
                          size={15}
                          style={{ animation: "spin 0.8s linear infinite" }}
                        />{" "}
                        Verifying…
                      </>
                    ) : (
                      <>
                        {" "}
                        Verify & Continue <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div style={{ animation: "fadeUp 0.25s ease" }}>
                  {/* Verified user banner */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: T.greenL,
                      border: `1px solid ${T.greenB}`,
                      borderRadius: 12,
                      padding: "12px 16px",
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg,${T.green},#047857)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {verifiedUser.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ fontSize: 13, fontWeight: 700, color: T.text }}
                      >
                        {verifiedUser.name}
                      </div>
                      <div style={{ fontSize: 11, color: T.muted }}>
                        EMP: {verifiedUser.employeeCode}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.green,
                        background: "#fff",
                        border: `1px solid ${T.greenB}`,
                        borderRadius: 20,
                        padding: "3px 9px",
                      }}
                    >
                      ✓ Verified
                    </div>
                  </div>

                  {/* Form fields */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 18,
                    }}
                  >
                    {/* Title */}
                    <FField
                      label="Task Title"
                      required
                      error={errors.title}
                      icon={Type}
                      iconColor={T.accent}
                    >
                      <FInput
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (errors.title)
                            setErrors((p) => ({ ...p, title: null }));
                        }}
                        placeholder="e.g. Fix broken light in corridor"
                        error={errors.title}
                        autoFocus
                      />
                    </FField>

                    {/* Description */}
                    <FField
                      label="Description"
                      required
                      error={errors.description}
                      icon={AlignLeft}
                      iconColor={T.purple || "#7C3AED"}
                    >
                      <FTextarea
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          if (errors.description)
                            setErrors((p) => ({ ...p, description: null }));
                        }}
                        placeholder="Describe the task in detail. What needs to be done and why?"
                        rows={4}
                        error={errors.description}
                      />
                    </FField>

                    {/* Location */}
                    <FField
                      label="Location"
                      required
                      error={errors.location}
                      icon={MapPin}
                      iconColor="#DC2626"
                    >
                      <FInput
                        value={location}
                        onChange={(e) => {
                          setLocation(e.target.value);
                          if (errors.location)
                            setErrors((p) => ({ ...p, location: null }));
                        }}
                        placeholder="e.g. Floor 3, Block B, Server Room"
                        error={errors.location}
                      />
                    </FField>
                  </div>

                  {/* Submit */}
                  <div
                    style={{
                      marginTop: 28,
                      paddingTop: 22,
                      borderTop: `1px solid ${T.border}`,
                    }}
                  >
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      style={{
                        width: "100%",
                        border: "none",
                        background: submitting
                          ? T.border2
                          : `linear-gradient(135deg,${T.accent},#4F46E5)`,
                        color: submitting ? T.muted : "#fff",
                        padding: "14px",
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: submitting ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        boxShadow: submitting
                          ? "none"
                          : `0 4px 14px ${T.accent}40`,
                        transition: "all 0.15s",
                      }}
                    >
                      {submitting ? (
                        <>
                          <Loader2
                            size={16}
                            style={{ animation: "spin 0.8s linear infinite" }}
                          />{" "}
                          Submitting…
                        </>
                      ) : (
                        <>
                          <Zap size={16} /> Submit Task Request
                        </>
                      )}
                    </button>
                    <p
                      style={{
                        textAlign: "center",
                        fontSize: 11,
                        color: T.muted2,
                        marginTop: 10,
                      }}
                    >
                      Your request will be reviewed by the team before being
                      assigned.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
