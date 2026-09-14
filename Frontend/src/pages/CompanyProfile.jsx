import React, { useState, useRef, useEffect } from "react";
import {
  Building2,
  Upload,
  Save,
  Globe,
  Phone,
  Mail,
  MapPin,
  Clock,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Pencil,
  X,
  Image,
  RefreshCw,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { updateCompany } from "../redux/slices/company/companySlice";
import { useDispatch } from "react-redux";
import { Select } from "antd";

const { Option } = Select;
/* ─── Design tokens — consistent with project theme ─────────────────────── */
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
  redL: "#FEF2F2",
  amber: "#D97706",
  amberL: "#FFFBEB",
  amberB: "#FDE68A",
  text: "#0F172A",
  muted: "#64748B",
  muted2: "#94A3B8",
  disabled: "#F8FAFC",
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
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

const TextInput = ({
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  maxLength,
}) => {
  const [f, setF] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: disabled ? T.disabled : T.card,
        border: `1px solid ${f ? T.accent : T.border2}`,
        borderRadius: "10px",
        padding: "0 12px",
        gap: "10px",
        boxShadow: f ? `0 0 0 3px ${T.accentB}55` : "none",
        transition: "all 0.15s",
      }}
    >
      {Icon && (
        <Icon
          size={15}
          color={f ? T.accent : T.muted2}
          style={{ flexShrink: 0, transition: "color 0.15s" }}
        />
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
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
      {maxLength && (
        <span style={{ fontSize: "11px", color: T.muted2 }}>
          {value?.length || 0}/{maxLength}
        </span>
      )}
    </div>
  );
};

const TextareaInput = ({ value, onChange, placeholder, rows = 3 }) => {
  const [f, setF] = useState(false);
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      style={{
        width: "100%",
        border: `1px solid ${f ? T.accent : T.border2}`,
        outline: "none",
        borderRadius: "10px",
        padding: "10px 12px",
        fontSize: "13px",
        color: T.text,
        fontFamily: "inherit",
        resize: "vertical",
        background: T.card,
        boxShadow: f ? `0 0 0 3px ${T.accentB}55` : "none",
        transition: "all 0.15s",
        boxSizing: "border-box",
      }}
    />
  );
};

const SectionCard = ({
  title,
  subtitle,
  icon: Icon,
  color = "#2563EB",
  children,
}) => (
  <div
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
        gap: "10px",
        marginBottom: "20px",
        paddingBottom: "14px",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "10px",
          background: `${color}12`,
          border: `1px solid ${color}25`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} color={color} />
      </div>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 700, color: T.text }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: "12px", color: T.muted }}>{subtitle}</div>
        )}
      </div>
    </div>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════ */
const CompanyProfile = () => {
  const dispatch = useDispatch();
  const fileRef = useRef();
  const faviconRef = useRef();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [saveHover, setSaveHover] = useState(false);
  const [faviconPreview, setFaviconPreview] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [form, setForm] = useState({
    companyName: "",
    tagline: "",
    website: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    gstNumber: "",
    panNumber: "",
    cinNumber: "",
    tanNumber: "",

    // company details
    industry: "",
    companySize: "",
    foundedYear: "",

    // social
    linkedinUrl: "",
  });

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/company");
        const d = res.data?.data || res.data;

        if (d) {
          setForm({
            companyName: d.softwareName || "",
            tagline: d.tagline || "",
            website: d.website || "",
            email: d.email || "",
            phone: d.phone || "",
            address: d.address || "",
            city: d.city || "",
            state: d.state || "",
            country: d.country || "",
            postalCode: d.postalCode || "",
            gstNumber: d.gstNumber || "",
            panNumber: d.panNumber || "",
            cinNumber: d.cinNumber || "",
            tanNumber: d.tanNumber || "",

            // company details
            industry: d.industry || "",
            companySize: d.companySize || "",
            foundedYear: d.foundedYear || "",

            // social
            linkedinUrl: d.linkedinUrl || "",
          });

          // full logo url
          if (d.logo) {
            setLogoPreview(
              d.logo.startsWith("http")
                ? d.logo
                : `${import.meta.env.VITE_API_BASE_URL}${d.logo}`,
            );
          }
          if (d.favicon) {
            setFaviconPreview(
              d.favicon.startsWith("http")
                ? d.favicon
                : `${import.meta.env.VITE_API_BASE_URL}${d.favicon}`,
            );
          }
        }
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleFaviconChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error("Favicon must be under 1 MB");
      return;
    }

    setFaviconFile(file);
    setFaviconPreview(URL.createObjectURL(file));
  };
  const handleSave = async () => {
    if (!form.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    const res = await dispatch(
      updateCompany({
        logoFile,
        faviconFile,
        companyName: form.companyName,
        tagline: form.tagline,
        website: form.website,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
        postalCode: form.postalCode,
        gstNumber: form.gstNumber,
        panNumber: form.panNumber,

        cinNumber: form.cinNumber,
        tanNumber: form.tanNumber,

        // company details
        industry: form.industry,
        companySize: form.companySize,
        foundedYear: form.foundedYear,

        // social
        linkedinUrl: form.linkedinUrl,
      }),
    );
    if (updateCompany.fulfilled.match(res)) {
      toast.success("Company profile saved successfully");
    } else {
      toast.error(res.payload || "Failed to save");
    }
  };

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        <Loader2
          size={28}
          color={T.accent}
          style={{ animation: "spin 0.8s linear infinite" }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  const initials = form.companyName
    ? form.companyName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CO";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        padding: "28px 24px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        input::placeholder,textarea::placeholder{color:${T.muted2};font-size:13px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .cp-card{animation:fadeUp 0.3s ease both}
        .cp-card:nth-child(2){animation-delay:0.05s}
        .cp-card:nth-child(3){animation-delay:0.10s}
        .cp-card:nth-child(4){animation-delay:0.15s}
        .cp-card:nth-child(5){animation-delay:0.20s}
        select option{background:#fff;color:${T.text}}
      `}</style>

      <div style={{ margin: "0 auto" }}>
        {/* ── Header ────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "24px",
            gap: "12px",
            flexWrap: "wrap",
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
              Company Profile
            </h1>
            <p style={{ fontSize: "13px", color: T.muted, marginTop: "2px" }}>
              Configure your organisation's identity and system-wide settings
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            onMouseEnter={() => setSaveHover(true)}
            onMouseLeave={() => setSaveHover(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: saving ? T.muted2 : saveHover ? "#1D4ED8" : T.accent,
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
                <Save size={15} /> Save All Changes
              </>
            )}
          </button>
        </div>

        {/* ── Identity: Logo + Name ──────────────────────────────────── */}
        <div
          className="cp-card"
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
              alignItems: "flex-start",
              gap: "28px",
              flexWrap: "wrap",
            }}
          >
            {/* Logo uploader */}
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
                  background: logoPreview
                    ? "transparent"
                    : `linear-gradient(135deg,${T.accent},#4F46E5)`,
                  border: `2px dashed ${logoPreview ? T.border2 : T.accentB}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  position: "relative",
                  transition: "all 0.2s",
                }}
                title="Click to upload logo"
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
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
                onChange={handleLogoChange}
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
            <div
              style={{
                marginTop: "14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <div
                onClick={() => faviconRef.current?.click()}
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  border: `2px dashed ${T.border2}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "#fff",
                }}
              >
                {faviconPreview ? (
                  <img
                    src={faviconPreview}
                    alt="favicon"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <Image size={14} color={T.muted2} />
                )}
              </div>

              <input
                ref={faviconRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFaviconChange}
              />
              <FieldLabel>Favicon</FieldLabel>

              <span style={{ fontSize: "10px", color: T.muted2 }}>
                32×32 recommended
              </span>
            </div>
            {/* Company name + tagline */}
            <div
              style={{
                flex: 1,
                minWidth: "280px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div>
                <FieldLabel required>Company Name</FieldLabel>
                <TextInput
                  icon={Building2}
                  value={form.companyName}
                  onChange={set("companyName")}
                  placeholder="Acme Corp"
                  maxLength={80}
                />
              </div>
              <div>
                <FieldLabel>Tagline / Motto</FieldLabel>
                <TextInput
                  icon={FileText}
                  value={form.tagline}
                  onChange={set("tagline")}
                  placeholder="Your inspiring company tagline"
                  maxLength={120}
                />
              </div>
              {/* Preview */}
              <div
                style={{
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: "12px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: `linear-gradient(135deg,${T.accent},#4F46E5)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "#fff",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <div
                    style={{ fontSize: "14px", fontWeight: 700, color: T.text }}
                  >
                    {form.companyName || "Your Company Name"}
                  </div>
                  <div style={{ fontSize: "12px", color: T.muted }}>
                    {form.tagline || "Tagline appears here"}
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    fontSize: "11px",
                    color: T.muted2,
                    fontStyle: "italic",
                  }}
                >
                  Preview
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Contact Information ────────────────────────────────────── */}
        <div className="cp-card">
          <SectionCard
            title="Contact Information"
            subtitle="How clients and partners reach your company"
            icon={Phone}
            color={T.accent}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
              }}
            >
              <div>
                <FieldLabel>Website</FieldLabel>
                <TextInput
                  icon={Globe}
                  value={form.website}
                  onChange={set("website")}
                  placeholder="https://yourcompany.com"
                />
              </div>
              <div>
                <FieldLabel>Company Email</FieldLabel>
                <TextInput
                  icon={Mail}
                  value={form.email}
                  onChange={set("email")}
                  placeholder="info@yourcompany.com"
                  type="email"
                />
              </div>
              <div>
                <FieldLabel>Phone Number</FieldLabel>
                <TextInput
                  icon={Phone}
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <FieldLabel>City</FieldLabel>
                <TextInput
                  icon={MapPin}
                  value={form.city}
                  onChange={set("city")}
                  placeholder="Mumbai"
                />
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <FieldLabel>Address</FieldLabel>
                <TextareaInput
                  value={form.address}
                  onChange={set("address")}
                  placeholder="Street address, landmark…"
                  rows={2}
                />
              </div>
              <div>
                <FieldLabel>State / Region</FieldLabel>
                <TextInput
                  icon={MapPin}
                  value={form.state}
                  onChange={set("state")}
                  placeholder="Maharashtra"
                />
              </div>
              <div>
                <FieldLabel>Country</FieldLabel>
                <TextInput
                  icon={Globe}
                  value={form.country}
                  onChange={set("country")}
                  placeholder="India"
                />
              </div>
              <div>
                <FieldLabel>Postal Code</FieldLabel>
                <TextInput
                  icon={Hash}
                  value={form.postalCode}
                  onChange={set("postalCode")}
                  placeholder="400001"
                />
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="cp-card">
          <SectionCard
            title="Tax & Registration"
            subtitle="Official business registration information"
            icon={FileText}
            color={T.green}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
              }}
            >
              <div>
                <FieldLabel>GST Number</FieldLabel>
                <TextInput
                  icon={Hash}
                  value={form.gstNumber}
                  onChange={set("gstNumber")}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>

              <div>
                <FieldLabel>PAN Number</FieldLabel>
                <TextInput
                  icon={Hash}
                  value={form.panNumber}
                  onChange={set("panNumber")}
                  placeholder="ABCDE1234F"
                />
              </div>

              <div>
                <FieldLabel>CIN Number</FieldLabel>
                <TextInput
                  icon={Hash}
                  value={form.cinNumber}
                  onChange={set("cinNumber")}
                  placeholder="L12345DL2025PLC000001"
                />
              </div>

              <div>
                <FieldLabel>TAN Number</FieldLabel>
                <TextInput
                  icon={Hash}
                  value={form.tanNumber}
                  onChange={set("tanNumber")}
                  placeholder="DELA12345B"
                />
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="cp-card">
          <SectionCard
            title="Company Details"
            subtitle="Business classification and organisation info"
            icon={Building2}
            color={T.amber}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "14px",
              }}
            >
              <div>
                <FieldLabel>Industry</FieldLabel>
                <TextInput
                  value={form.industry}
                  onChange={set("industry")}
                  placeholder="Software / IT"
                />
              </div>

              <div>
                <FieldLabel>Company Size</FieldLabel>
                <Select
                  value={form.companySize}
                  onChange={(val) =>
                    setForm((p) => ({ ...p, companySize: val }))
                  }
                  style={{ width: "100%", height: 40 }}
                  placeholder="Select company size"
                >
                  <Option value="1-10 Employees">1-10 Employees</Option>
                  <Option value="11-50 Employees">11-50 Employees</Option>
                  <Option value="51-200 Employees">51-200 Employees</Option>
                  <Option value="201-500 Employees">201-500 Employees</Option>
                  <Option value="500+ Employees">500+ Employees</Option>
                </Select>
              </div>

              <div>
                <FieldLabel>Founded Year</FieldLabel>
                <TextInput
                  type="number"
                  value={form.foundedYear}
                  onChange={set("foundedYear")}
                  placeholder="2025"
                />
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="cp-card">
          <SectionCard
            title="Branding & Social"
            subtitle="Public brand identity configuration"
            icon={Globe}
            color={T.accent}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
              }}
            >
              <div>
                <FieldLabel>LinkedIn URL</FieldLabel>
                <TextInput
                  icon={Globe}
                  value={form.linkedinUrl}
                  onChange={set("linkedinUrl")}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>
            </div>
          </SectionCard>
        </div>
        {/* ── Sticky save bar at bottom ──────────────────────────────── */}
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: "14px",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            boxShadow: "0 -2px 12px rgba(0,0,0,0.04)",
            position: "sticky",
            bottom: "16px",
          }}
        >
          <div style={{ flex: 1, fontSize: "12px", color: T.muted }}>
            Changes apply immediately for all users after saving.
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            onMouseEnter={() => setSaveHover(true)}
            onMouseLeave={() => setSaveHover(false)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: saving ? T.muted2 : saveHover ? "#1D4ED8" : T.accent,
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit",
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
    </div>
  );
};

export default CompanyProfile;
