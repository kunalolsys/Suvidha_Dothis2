import React, { useState, useEffect } from "react";
import {
  Send, MessageSquare, Mail, Slack, Bell, CheckCircle2,
  XCircle, Eye, EyeOff, Save, Loader2, AlertTriangle,
  RefreshCw, Zap, ChevronDown, ChevronUp, Copy, Check,
  Shield, Activity,
} from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

/* ─── Design tokens ───────────────────────────────────────────────────────── */
const T = {
  bg:      "#F1F5F9",
  card:    "#FFFFFF",
  border:  "#E2E8F0",
  border2: "#CBD5E1",
  accent:  "#2563EB",
  accentL: "#EFF6FF",
  accentB: "#BFDBFE",
  green:   "#059669",
  greenL:  "#ECFDF5",
  greenB:  "#6EE7B7",
  red:     "#DC2626",
  redL:    "#FEF2F2",
  amber:   "#D97706",
  amberL:  "#FFFBEB",
  amberB:  "#FDE68A",
  purple:  "#7C3AED",
  purpleL: "#F5F3FF",
  purpleB: "#DDD6FE",
  text:    "#0F172A",
  muted:   "#64748B",
  muted2:  "#94A3B8",
  disabled:"#F8FAFC",
};

/* ─── Platform registry ───────────────────────────────────────────────────── */
const PLATFORMS = [
  {
    id:       "telegram",
    label:    "Telegram",
    icon:     "✈️",
    color:    "#0088CC",
    colorL:   "#E8F4FD",
    colorB:   "#B3D9F5",
    description: "Send task notifications, alerts, and escalations via Telegram bot messages.",
    docsUrl:  "https://core.telegram.org/bots#how-do-i-create-a-bot",
    fields: [
      { key:"botToken",   label:"Bot Token",    type:"password", placeholder:"123456:ABCDef...",         help:"Get from @BotFather on Telegram", required:true },
      { key:"chatId",     label:"Default Chat ID", type:"text", placeholder:"-100123456789 or @channel", help:"Group/channel where notifications go", required:true },
      { key:"threadId",   label:"Thread ID",    type:"text", placeholder:"Optional message thread ID",   help:"For supergroup topic threads (optional)" },
    ],
  },
  {
    id:       "whatsapp",
    label:    "WhatsApp",
    icon:     "💬",
    color:    "#25D366",
    colorL:   "#E8F8EF",
    colorB:   "#A7EACC",
    description: "Send WhatsApp messages via the Meta Business Cloud API.",
    docsUrl:  "https://developers.facebook.com/docs/whatsapp/cloud-api",
    fields: [
      { key:"accessToken",    label:"Access Token",         type:"password", placeholder:"EAAxxxxxx",         help:"From Meta Developer Console",       required:true },
      { key:"phoneNumberId",  label:"Phone Number ID",      type:"text",     placeholder:"123456789012345",   help:"WhatsApp Business phone number ID",  required:true },
      { key:"businessAccountId",label:"Business Account ID",type:"text",    placeholder:"987654321098765",   help:"Meta Business Account ID" },
      { key:"webhookSecret",  label:"Webhook Verify Token", type:"password", placeholder:"my_verify_token",   help:"Used to verify incoming webhooks" },
    ],
  },
  {
    id:       "email",
    label:    "Email (SMTP)",
    icon:     "📧",
    color:    T.accent,
    colorL:   T.accentL,
    colorB:   T.accentB,
    description: "Send transactional emails for task assignments, due dates, and escalations.",
    docsUrl:  "",
    fields: [
      { key:"smtpHost",     label:"SMTP Host",       type:"text",     placeholder:"smtp.gmail.com",   help:"Your mail server hostname",          required:true },
      { key:"smtpPort",     label:"SMTP Port",       type:"number",   placeholder:"587",              help:"Usually 587 (TLS) or 465 (SSL)",     required:true },
      { key:"smtpUser",     label:"Username / Email",type:"text",     placeholder:"you@company.com",  help:"SMTP authentication username",       required:true },
      { key:"smtpPass",     label:"Password / App Key",type:"password",placeholder:"••••••••••",     help:"SMTP password or app-specific key",  required:true },
      { key:"smtpFrom",     label:"From Name",       type:"text",     placeholder:"DoThis2 Alerts",   help:"Display name in sent emails" },
      { key:"smtpFromEmail",label:"From Email",      type:"text",     placeholder:"noreply@company.com",help:"Sender email address" },
      { key:"smtpSecure",   label:"Encryption",      type:"select",   options:["TLS","SSL","None"],   help:"Connection security" },
    ],
  },
  {
    id:       "slack",
    label:    "Slack",
    icon:     "🟦",
    color:    "#4A154B",
    colorL:   "#F4EAF5",
    colorB:   "#D9AEE0",
    description: "Post notifications to Slack channels using an incoming webhook.",
    docsUrl:  "https://api.slack.com/messaging/webhooks",
    fields: [
      { key:"webhookUrl", label:"Webhook URL",      type:"password", placeholder:"https://hooks.slack.com/services/...", help:"Incoming Webhook URL from your Slack app", required:true },
      { key:"channel",    label:"Default Channel",  type:"text",     placeholder:"#notifications",  help:"Slack channel (with # prefix)" },
      { key:"botName",    label:"Bot Display Name", type:"text",     placeholder:"DoThis2 Bot",     help:"Name shown in Slack messages" },
    ],
  },
  {
    id:       "webhook",
    label:    "Custom Webhook",
    icon:     "🔗",
    color:    T.amber,
    colorL:   T.amberL,
    colorB:   T.amberB,
    description: "Send event payloads to any HTTP endpoint — integrate with your own systems.",
    docsUrl:  "",
    fields: [
      { key:"url",        label:"Endpoint URL",   type:"text",     placeholder:"https://your-api.com/hooks/dothis2", help:"POST endpoint that receives JSON payloads", required:true },
      { key:"secret",     label:"Secret / Token", type:"password", placeholder:"Bearer token or HMAC secret",        help:"Sent as Authorization header" },
      { key:"contentType",label:"Content Type",   type:"select",   options:["application/json","application/x-www-form-urlencoded"], help:"Request body format" },
    ],
  },
];

/* ─── Reusable field helpers ──────────────────────────────────────────────── */
const FieldLabel = ({ children, required }) => (
  <label style={{display:"block",fontSize:"11px",fontWeight:600,letterSpacing:"0.6px",textTransform:"uppercase",color:T.muted,marginBottom:"6px"}}>
    {children}{required && <span style={{color:T.red,marginLeft:"3px"}}>*</span>}
  </label>
);

const SecretInput = ({ value, onChange, placeholder, help }) => {
  const [show, setShow] = useState(false);
  const [f, setF]       = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if(value){ navigator.clipboard.writeText(value); setCopied(true); setTimeout(()=>setCopied(false),1500); }
  };

  return (
    <div>
      <div style={{
        display:"flex",alignItems:"center",background:T.card,
        border:`1px solid ${f?T.accent:T.border2}`,borderRadius:"10px",
        padding:"0 10px",gap:"8px",
        boxShadow:f?`0 0 0 3px ${T.accentB}55`:"none",transition:"all 0.15s",
      }}>
        <Shield size={14} color={f?T.accent:T.muted2} style={{flexShrink:0}}/>
        <input
          type={show?"text":"password"} value={value} onChange={onChange}
          placeholder={placeholder} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
          style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:"13px",color:T.text,padding:"10px 0",fontFamily:"inherit"}}
        />
        <div style={{display:"flex",gap:"4px"}}>
          <button type="button" onClick={()=>setShow(v=>!v)}
            style={{background:"none",border:"none",cursor:"pointer",color:T.muted2,padding:"2px",display:"flex"}}>
            {show ? <EyeOff size={14}/> : <Eye size={14}/>}
          </button>
          <button type="button" onClick={copy}
            style={{background:"none",border:"none",cursor:"pointer",color:copied?T.green:T.muted2,padding:"2px",display:"flex"}}>
            {copied ? <Check size={14}/> : <Copy size={14}/>}
          </button>
        </div>
      </div>
      {help && <div style={{fontSize:"11px",color:T.muted2,marginTop:"4px"}}>{help}</div>}
    </div>
  );
};

const PlainInput = ({ value, onChange, placeholder, type="text", help, options }) => {
  const [f, setF] = useState(false);
  if(type==="select") return (
    <div>
      <div style={{
        display:"flex",alignItems:"center",background:T.card,
        border:`1px solid ${f?T.accent:T.border2}`,borderRadius:"10px",padding:"0 12px",
        boxShadow:f?`0 0 0 3px ${T.accentB}55`:"none",transition:"all 0.15s",
      }}>
        <select value={value} onChange={onChange} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
          style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:"13px",color:T.text,padding:"10px 0",fontFamily:"inherit",appearance:"none",cursor:"pointer"}}>
          {(options||[]).map(o=><option key={o}>{o}</option>)}
        </select>
      </div>
      {help && <div style={{fontSize:"11px",color:T.muted2,marginTop:"4px"}}>{help}</div>}
    </div>
  );
  return (
    <div>
      <div style={{
        display:"flex",alignItems:"center",background:T.card,
        border:`1px solid ${f?T.accent:T.border2}`,borderRadius:"10px",padding:"0 12px",
        boxShadow:f?`0 0 0 3px ${T.accentB}55`:"none",transition:"all 0.15s",
      }}>
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={()=>setF(true)} onBlur={()=>setF(false)}
          style={{flex:1,border:"none",outline:"none",background:"transparent",fontSize:"13px",color:T.text,padding:"10px 0",fontFamily:"inherit"}}
        />
      </div>
      {help && <div style={{fontSize:"11px",color:T.muted2,marginTop:"4px"}}>{help}</div>}
    </div>
  );
};

/* ─── Status Badge ────────────────────────────────────────────────────────── */
const StatusBadge = ({ connected }) => (
  <span style={{
    display:"inline-flex",alignItems:"center",gap:"5px",
    padding:"3px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:600,
    background: connected ? T.greenL : T.disabled,
    color: connected ? T.green : T.muted,
    border:`1px solid ${connected ? T.greenB : T.border}`,
  }}>
    <span style={{width:"6px",height:"6px",borderRadius:"50%",background:connected?T.green:T.muted2,display:"inline-block",animation:connected?"blink 2s ease infinite":"none"}}/>
    {connected ? "Connected" : "Not configured"}
  </span>
);

/* ─── Platform Card ───────────────────────────────────────────────────────── */
const PlatformCard = ({ platform, creds, onChange, onSave, onTest, saving, testing, connected }) => {
  const [expanded, setExpanded] = useState(false);

  const hasAnyValue = platform.fields.some(f => (creds[f.key]||"").trim());

  return (
    <div style={{
      background:T.card,border:`1px solid ${expanded ? platform.colorB : T.border}`,
      borderRadius:"16px",overflow:"hidden",
      boxShadow: expanded ? `0 4px 20px ${platform.color}14` : "0 1px 4px rgba(0,0,0,0.05)",
      transition:"all 0.2s",
      marginBottom:"12px",
    }}>
      {/* Card header */}
      <div
        onClick={()=>setExpanded(v=>!v)}
        style={{
          display:"flex",alignItems:"center",gap:"16px",
          padding:"18px 20px",cursor:"pointer",
          background: expanded ? `${platform.color}06` : "transparent",
          borderBottom: expanded ? `1px solid ${T.border}` : "none",
          transition:"background 0.15s",
        }}
      >
        {/* Icon */}
        <div style={{
          width:"44px",height:"44px",borderRadius:"12px",
          background:platform.colorL,border:`1px solid ${platform.colorB}`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px",flexShrink:0,
        }}>
          {platform.icon}
        </div>

        {/* Title + description */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"3px"}}>
            <span style={{fontSize:"14px",fontWeight:700,color:T.text}}>{platform.label}</span>
            <StatusBadge connected={connected}/>
          </div>
          <div style={{fontSize:"12px",color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{platform.description}</div>
        </div>

        {/* Expand toggle */}
        <div style={{color:T.muted2,flexShrink:0}}>
          {expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </div>
      </div>

      {/* Expanded fields */}
      {expanded && (
        <div style={{padding:"20px"}}>
          {/* Docs link */}
          {platform.docsUrl && (
            <div style={{
              background:T.amberL,border:`1px solid ${T.amberB}`,borderRadius:"10px",
              padding:"10px 14px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"8px",
              fontSize:"12px",color:T.amber,
            }}>
              <AlertTriangle size={13}/>
              <span>Need credentials?</span>
              <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer"
                style={{color:T.accent,fontWeight:600,textDecoration:"none"}}>
                Read the official docs →
              </a>
            </div>
          )}

          {/* Fields grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"20px"}}>
            {platform.fields.map(field => (
              <div key={field.key} style={{gridColumn: field.key==="url" || field.key==="webhookUrl" || field.key==="smtpHost" ? "span 2" : "span 1"}}>
                <FieldLabel required={field.required}>{field.label}</FieldLabel>
                {field.type==="password"
                  ? <SecretInput value={creds[field.key]||""} onChange={e=>onChange(field.key,e.target.value)} placeholder={field.placeholder} help={field.help}/>
                  : <PlainInput  value={creds[field.key]||""} onChange={e=>onChange(field.key,e.target.value)} placeholder={field.placeholder} type={field.type} help={field.help} options={field.options}/>
                }
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{display:"flex",alignItems:"center",gap:"10px",justifyContent:"flex-end",paddingTop:"14px",borderTop:`1px solid ${T.border}`}}>
            {/* Test connection */}
            <button
              onClick={()=>onTest(platform.id)}
              disabled={testing || !hasAnyValue}
              style={{
                display:"inline-flex",alignItems:"center",gap:"7px",
                background: testing ? T.disabled : T.bg,
                color: testing ? T.muted : T.muted,
                border:`1px solid ${T.border2}`,borderRadius:"9px",
                padding:"9px 16px",fontSize:"13px",fontWeight:600,
                cursor: testing||!hasAnyValue ? "not-allowed" : "pointer",
                fontFamily:"inherit",transition:"all 0.15s",opacity:!hasAnyValue?0.5:1,
              }}
            >
              {testing
                ? <><Loader2 size={13} style={{animation:"spin 0.8s linear infinite"}}/> Testing…</>
                : <><Activity size={13}/> Test Connection</>
              }
            </button>

            {/* Save */}
            <button
              onClick={()=>onSave(platform.id)}
              disabled={saving}
              style={{
                display:"inline-flex",alignItems:"center",gap:"7px",
                background: saving ? T.muted2 : platform.color,
                color:"#fff",border:"none",borderRadius:"9px",
                padding:"9px 16px",fontSize:"13px",fontWeight:700,
                cursor:saving?"not-allowed":"pointer",fontFamily:"inherit",
                boxShadow:`0 2px 8px ${platform.color}30`,
                transition:"all 0.15s",
              }}
            >
              {saving
                ? <><Loader2 size={13} style={{animation:"spin 0.8s linear infinite"}}/> Saving…</>
                : <><Save size={13}/> Save {platform.label}</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════════════════════ */
const NotificationIntegrations = () => {
  // creds: { telegram: { botToken:"", chatId:"", ... }, whatsapp: {...}, ... }
  const [creds, setCreds]           = useState(
    Object.fromEntries(PLATFORMS.map(p=>[p.id, Object.fromEntries(p.fields.map(f=>[f.key,""]))]))
  );
  const [connected, setConnected]   = useState({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState({}); // { platformId: bool }
  const [testing, setTesting]       = useState({}); // { platformId: bool }

  // Global notification events toggle
  const [events, setEvents] = useState({
    taskAssigned:   true,
    taskDue:        true,
    taskOverdue:    true,
    taskCompleted:  false,
    fmsLaunched:    true,
    fmsTaskActive:  true,
    escalation:     true,
    queryRaised:    true,
  });

  const toggleEvent = (key) => setEvents(p=>({...p,[key]:!p[key]}));

  useEffect(()=>{
    const fetch = async()=>{
      try{
        // GET /api/v1/integrations → { data: { telegram:{...}, whatsapp:{...}, ... }, connected:{...}, events:{...} }
        const res = await api.get("/integrations");
        const d   = res.data?.data || res.data;
        if(d?.credentials) setCreds(prev=>({...prev,...d.credentials}));
        if(d?.connected)   setConnected(d.connected);
        if(d?.events)      setEvents(prev=>({...prev,...d.events}));
      }catch(e){ /* no config yet — use defaults */ }
      finally{ setLoading(false); }
    };
    fetch();
  },[]);

  const handleChange = (platformId, field, value) =>
    setCreds(prev=>({ ...prev, [platformId]:{ ...prev[platformId], [field]:value } }));

  const handleSave = async(platformId)=>{
    setSaving(p=>({...p,[platformId]:true}));
    try{
      // PUT /api/v1/integrations/:platformId
      await api.put(`/integrations/${platformId}`, { credentials: creds[platformId] });
      setConnected(p=>({...p,[platformId]:true}));
      toast.success(`${PLATFORMS.find(p=>p.id===platformId)?.label} saved successfully`);
    }catch(e){
      toast.error(e?.response?.data?.message || "Failed to save");
    }finally{
      setSaving(p=>({...p,[platformId]:false}));
    }
  };

  const handleTest = async(platformId)=>{
    setTesting(p=>({...p,[platformId]:true}));
    try{
      // POST /api/v1/integrations/:platformId/test
      await api.post(`/integrations/${platformId}/test`, { credentials: creds[platformId] });
      toast.success("Test message sent successfully! Check your " + PLATFORMS.find(p=>p.id===platformId)?.label);
    }catch(e){
      toast.error(e?.response?.data?.message || "Test failed — check your credentials");
    }finally{
      setTesting(p=>({...p,[platformId]:false}));
    }
  };

  const handleSaveEvents = async()=>{
    try{
      await api.put("/integrations/events", { events });
      toast.success("Notification events saved");
    }catch(e){
      toast.error("Failed to save event settings");
    }
  };

  const connectedCount = Object.values(connected).filter(Boolean).length;

  if(loading) return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
      <Loader2 size={28} color={T.accent} style={{animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:"'DM Sans','Segoe UI',sans-serif",padding:"28px 24px"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        input::placeholder{color:${T.muted2};font-size:13px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        select option{background:#fff;color:${T.text}}
      `}</style>

      <div style={{maxWidth:"820px",margin:"0 auto"}}>

        {/* ── Header ────────────────────────────────────────────────── */}
        <div style={{marginBottom:"24px",animation:"fadeUp 0.3s ease"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px",flexWrap:"wrap"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"4px"}}>
                <div style={{width:"36px",height:"36px",borderRadius:"10px",background:`linear-gradient(135deg,${T.accent},#4F46E5)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Bell size={18} color="#fff"/>
                </div>
                <h1 style={{fontSize:"22px",fontWeight:800,color:T.text,margin:0,letterSpacing:"-0.5px"}}>
                  Notification Integrations
                </h1>
              </div>
              <p style={{fontSize:"13px",color:T.muted,marginLeft:"46px"}}>
                Connect platforms and configure which events trigger notifications
              </p>
            </div>
            {/* Connected count */}
            <div style={{
              background:T.card,border:`1px solid ${T.border}`,borderRadius:"12px",
              padding:"10px 16px",display:"flex",alignItems:"center",gap:"10px",
              boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
            }}>
              <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                <span style={{width:"8px",height:"8px",borderRadius:"50%",background:connectedCount>0?T.green:T.muted2,display:"inline-block",animation:connectedCount>0?"blink 2s ease infinite":"none"}}/>
                <span style={{fontSize:"20px",fontWeight:800,color:T.text}}>{connectedCount}</span>
              </div>
              <div style={{fontSize:"12px",color:T.muted}}>
                of {PLATFORMS.length} platforms<br/>connected
              </div>
            </div>
          </div>
        </div>

        {/* ── Platform cards ─────────────────────────────────────────── */}
        <div style={{marginBottom:"20px",animation:"fadeUp 0.35s ease"}}>
          {PLATFORMS.map(platform => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              creds={creds[platform.id]||{}}
              connected={!!connected[platform.id]}
              onChange={(field,value)=>handleChange(platform.id,field,value)}
              onSave={handleSave}
              onTest={handleTest}
              saving={!!saving[platform.id]}
              testing={!!testing[platform.id]}
            />
          ))}
        </div>

        {/* ── Notification events control ────────────────────────────── */}
        <div style={{
          background:T.card,border:`1px solid ${T.border}`,borderRadius:"18px",
          padding:"24px",marginBottom:"16px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
          animation:"fadeUp 0.4s ease",
        }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"18px",paddingBottom:"14px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <div style={{width:"34px",height:"34px",borderRadius:"10px",background:T.purpleL,border:`1px solid ${T.purpleB}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Zap size={16} color={T.purple}/>
              </div>
              <div>
                <div style={{fontSize:"13px",fontWeight:700,color:T.text}}>Event Triggers</div>
                <div style={{fontSize:"12px",color:T.muted}}>Choose which events send notifications across all connected platforms</div>
              </div>
            </div>
            <button
              onClick={handleSaveEvents}
              style={{
                display:"inline-flex",alignItems:"center",gap:"7px",
                background:T.purple,color:"#fff",border:"none",borderRadius:"9px",
                padding:"9px 16px",fontSize:"13px",fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",
                boxShadow:`0 2px 8px ${T.purple}30`,
              }}
            >
              <Save size={13}/> Save Events
            </button>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
            {[
              { key:"taskAssigned",  label:"Task Assigned",       sub:"When a task is assigned to a user",           icon:"📋" },
              { key:"taskDue",       label:"Task Due Soon",        sub:"24h before task deadline",                    icon:"⏰" },
              { key:"taskOverdue",   label:"Task Overdue",         sub:"When task passes its due date incomplete",    icon:"🔴" },
              { key:"taskCompleted", label:"Task Completed",       sub:"When a task is marked as done",               icon:"✅" },
              { key:"fmsLaunched",   label:"FMS Launched",         sub:"When a new FMS instance is started",          icon:"🚀" },
              { key:"fmsTaskActive", label:"FMS Task Activated",   sub:"When your turn comes in an FMS workflow",     icon:"⚡" },
              { key:"escalation",    label:"Escalation Triggered", sub:"When a task is escalated",                   icon:"🆘" },
              { key:"queryRaised",   label:"Query Raised",         sub:"When a query is raised on your task",         icon:"❓" },
            ].map(({ key, label, sub, icon }) => (
              <div
                key={key}
                onClick={()=>toggleEvent(key)}
                style={{
                  display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",
                  background: events[key] ? T.greenL : T.bg,
                  border:`1px solid ${events[key] ? T.greenB : T.border}`,
                  borderRadius:"12px",cursor:"pointer",transition:"all 0.15s",
                }}
              >
                <span style={{fontSize:"20px",flexShrink:0}}>{icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:"13px",fontWeight:600,color:T.text}}>{label}</div>
                  <div style={{fontSize:"11px",color:T.muted}}>{sub}</div>
                </div>
                <div style={{
                  width:"36px",height:"20px",borderRadius:"10px",flexShrink:0,
                  background: events[key] ? `linear-gradient(135deg,${T.green},#10B981)` : T.border,
                  position:"relative",transition:"background 0.2s",
                }}>
                  <div style={{
                    position:"absolute",top:"3px",
                    left: events[key] ? "19px" : "3px",
                    width:"14px",height:"14px",borderRadius:"50%",background:"#fff",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
                    transition:"left 0.2s",
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default NotificationIntegrations;