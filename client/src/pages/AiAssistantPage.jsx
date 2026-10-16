import { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  ChevronRight,
  Clipboard,
  Flame,
  HeartPulse,
  Info,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  User,
  Zap,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { queryAssistant } from '../services/assistant.js';

// Evidence-based EMS protocols for deterministic, high-reliability field guidance
const CLINICAL_PROTOCOLS = {
  anaphylaxis: {
    title: 'Anaphylaxis Management & Epinephrine Administration',
    chip: 'Anaphylaxis Protocol',
    keywords: ['anaphylaxis', 'epinephrine', 'allergic', 'epi', 'stridor', 'wheezing', 'hives'],
    urgency: 'CRITICAL',
    content: `### 1. Immediate Primary Assessment & Airway Priority
- Assess for severe respiratory compromise (stridor, wheezing, dyspnea) or hypotension (systolic BP < 90 mmHg).
- Administer High-Flow Oxygen via Non-Rebreather Mask (12–15 L/min).
- Position patient recumbent with legs elevated (do NOT allow patient to stand or sit up abruptly).

### 2. First-Line Pharmacotherapy (DO NOT DELAY)
- **Epinephrine 1:1,000 (1 mg/mL)** via Intramuscular (IM) injection in the **Anterolateral Mid-Thigh**:
  - **Adult (≥ 30 kg):** 0.3 mg to 0.5 mg IM.
  - **Pediatric (< 30 kg):** 0.01 mg/kg (up to 0.15 mg) IM.
  - Repeat every 5 to 15 minutes if symptoms persist or deteriorate.

### 3. Secondary Interventions (Post-Epinephrine)
- Establish Large-Bore IV access (16G or 18G) en route.
- If hypotensive: Normal Saline 20 mL/kg rapid bolus IV.
- **Diphenhydramine (Benadryl):** Adult 25–50 mg IV/IM.
- **Albuterol Nebulizer:** 2.5 mg in 3 mL NS for persistent bronchospasm.

### 4. Critical Warnings & Contraindications
- There are **NO absolute contraindications** to Epinephrine in life-threatening anaphylaxis.
- Monitor continuously for biphasic anaphylactic recurrence (may occur 1–8 hours post-resolution).`,
  },

  start_triage: {
    title: 'START Triage Algorithm (Simple Triage & Rapid Treatment)',
    chip: 'START Triage Rules',
    keywords: ['start', 'triage', 'mass casualty', 'mci', 'disaster', 'rpm'],
    urgency: 'URGENT',
    content: `### 1. Step 1: Walking Wounded (Green / Delayed)
- Direct all walking patients to a designated triage point.
- Tag all patients who can understand and walk as **GREEN (Delayed / Minor)**.

### 2. Step 2: Respiration (R)
- **No breathing:** Reposition airway (jaw-thrust / chin-lift).
  - Still no spontaneous breathing: Tag **BLACK (Expectant / Deceased)**.
  - Spontaneous breathing restored: Tag **RED (Immediate)**.
- **Breathing rate > 30 breaths/min:** Tag **RED (Immediate)**.
- **Breathing rate < 30 breaths/min:** Proceed immediately to Perfusion.

### 3. Step 3: Perfusion (P)
- Check radial pulse or capillary refill:
  - Radial pulse ABSENT or Capillary Refill > 2 seconds: Tag **RED (Immediate)**. Control major external bleeding.
  - Radial pulse PRESENT or Capillary Refill ≤ 2 seconds: Proceed immediately to Mental Status.

### 4. Step 4: Mental Status (M)
- Can follow simple commands ("squeeze my fingers"): Tag **YELLOW (Urgent / Delayed)**.
- Cannot follow simple commands (unconscious or altered mental state): Tag **RED (Immediate)**.`,
  },

  pediatric_burns: {
    title: 'Pediatric Burn & Fluid Resuscitation Protocol',
    chip: 'Pediatric Burn Assessment',
    keywords: ['burn', 'pediatric burn', 'parkland', 'rule of nines', 'scald'],
    urgency: 'URGENT',
    content: `### 1. Surface Area Assessment (Modified Pediatric Rule of Nines)
- **Head & Neck:** 18% (larger relative body surface area).
- **Anterior Torso:** 18% | **Posterior Torso:** 18%.
- **Each Arm:** 9% (4.5% anterior / 4.5% posterior).
- **Each Leg:** 14% (7% anterior / 7% posterior).
- **Perineum:** 1%.

### 2. Resuscitation Fluid (Modified Parkland Formula)
- **Fluid Requirement:** 3 to 4 mL × Weight in kg × % TBSA (Partial & Full Thickness only).
- Give **50% of total calculated volume** in the **first 8 hours** from time of injury.
- Give remaining 50% over the subsequent 16 hours.
- Fluid of choice: Warm Lactated Ringer's (LR).

### 3. Critical EMS Field Precautions
- **Hypothermia Prevention:** Do NOT apply ice or cold wet soaks to burns > 10% TBSA. Cover with clean, dry sterile sheets.
- Early airway evaluation: Inhalation injury, facial burns, or singed nasal hairs mandate early pre-hospital endotracheal intubation.`,
  },

  severe_trauma: {
    title: 'Severe Trauma & Catastrophic Hemorrhage Control',
    chip: 'Severe Trauma / Hemorrhage',
    keywords: ['trauma', 'hemorrhage', 'bleeding', 'tourniquet', 'txa', 'shock'],
    urgency: 'CRITICAL',
    content: `### 1. Immediate Life Threat: Massive External Bleeding (C-ABC)
- Apply direct, sustained pressure with hemostatic gauze directly into wound cavity.
- For extremity arterial hemorrhage not controlled by direct pressure: Apply **Combat Application Tourniquet (CAT)** 2–3 inches proximal to injury site (not over a joint).
- Tighten until distal pulse is eliminated and bleeding ceases completely. Note exact application time on tourniquet band.

### 2. Hemorrhagic Shock Resuscitation
- **Permissive Hypotension:** Target systolic BP of **80–90 mmHg** (sufficient for cerebral perfusion and palpable radial pulse) until surgical control. Avoid aggressive crystalloid over-resuscitation to prevent "popping the clot".
- **Tranexamic Acid (TXA):** 1 g IV in 100 mL NS infused over 10 minutes (must be given within 3 hours of injury).

### 3. Spinal Motion Restriction & Pelvic Binder
- Apply commercial pelvic compression device for suspected pelvic ring disruption with hemodynamic instability.
- Cervical collar and log-roll onto scoop stretcher with manual in-line stabilization.`,
  },

  stroke_befast: {
    title: 'Acute Stroke & Large Vessel Occlusion (BE-FAST)',
    chip: 'Suspected Stroke (BE-FAST)',
    keywords: ['stroke', 'cva', 'befast', 'fast', 'paralysis', 'slur', 'facial droop'],
    urgency: 'CRITICAL',
    content: `### 1. BE-FAST Rapid Screen
- **B - Balance:** Sudden onset loss of balance, ataxia, or dizziness.
- **E - Eyes:** Sudden loss of vision in one or both eyes, diplopia.
- **F - Face:** Facial droop or asymmetry on smile test.
- **A - Arms:** Motor drift or pronator drift after 10 seconds.
- **S - Speech:** Slurred speech, expressive/receptive aphasia, or inability to repeat phrases.
- **T - Time:** Document exact **Last Known Well (LKW)** time.

### 2. Critical Field Actions
- **Blood Glucose:** Must be measured immediately on scene to rule out hypoglycemia mimic (treat if < 60 mg/dL).
- **Stroke Alert:** Pre-notify Comprehensive Stroke Centre before departure.
- Maintain Head of Bed (HOB) at 0–15° flat if tolerated unless airway compromise or elevated ICP suspected.
- Do NOT treat hypertension pre-hospital unless systolic BP > 220 mmHg or diastolic > 120 mmHg under physician direction.`,
  },

  hypoglycemia: {
    title: 'Acute Hypoglycemia Field Management Protocol',
    chip: 'Hypoglycemia Emergency Protocol',
    keywords: ['hypoglycemia', 'low sugar', 'glucose', 'diabetic', 'dextrose', 'glucagon'],
    urgency: 'URGENT',
    content: `### 1. Diagnostic Threshold
- Symptomatic patient with Blood Glucose **< 60 mg/dL (3.3 mmol/L)**.
- Common presentations: Diaphoresis, tremors, altered mental status, seizures, focal neurological deficits.

### 2. Conscious Patient with Intact Gag Reflex
- 15–20 g of fast-acting oral glucose (gel or chewable tablets).
- Re-check capillary blood glucose in 15 minutes.

### 3. Altered Mental Status / Impaired Airway
- **Dextrose 10% in Water (D10W):** 100–200 mL IV infusion (preferred over D50W to reduce extravasation injury and rebound hyperglycemia).
- If IV access unobtainable: **Glucagon 1 mg IM / Intranasal (Baqsimi 3 mg)**.
- Re-evaluate GCS and blood glucose 10 minutes post-administration.
- Once conscious, provide oral complex carbohydrates to prevent recurrence.`,
  },
};

export default function AiAssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      sender: 'assistant',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Emergency Protocol Assistant operational. Ask clinical reference questions or select a clinical standard below for immediate field protocol guidance.`,
      protocol: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const findMatchingProtocol = (queryText) => {
    const lower = queryText.toLowerCase();
    for (const [key, proto] of Object.entries(CLINICAL_PROTOCOLS)) {
      if (lower.includes(key.replace('_', ' ')) || proto.keywords.some((kw) => lower.includes(kw))) {
        return proto;
      }
    }
    return null;
  };

  const handleChipClick = (proto) => {
    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: proto.chip,
    };
    const assistantMsg = {
      id: `a-${Date.now() + 1}`,
      sender: 'assistant',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Verified Evidence-Based EMS Protocol retrieved for **${proto.title}**:`,
      protocol: proto,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
  };

  const handleSend = async (userText) => {
    const textToSend = (userText || input).trim();
    if (!textToSend || isTyping) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsTyping(true);

    const conversationHistory = nextMessages
      .slice(-6)
      .map((m) => ({ sender: m.sender, text: m.text }));

    try {
      const res = await queryAssistant({
        message: textToSend,
        conversationHistory,
      });

      const replyText =
        res?.reply ||
        res?.data?.reply ||
        res?.message ||
        res?.data?.message ||
        (typeof res === 'string' ? res : 'No response text received.');

      const modelUsed = res?.model || res?.data?.model || null;
      const genMs = res?.generationMs || res?.data?.generationMs || null;

      const match = findMatchingProtocol(textToSend);

      const assistantMsg = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: replyText,
        model: modelUsed,
        generationMs: genMs,
        protocol: match,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const fallbackMatch = findMatchingProtocol(textToSend);
      const assistantMsg = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: fallbackMatch
          ? `(Local AI unavailable — Retrieved from offline evidence-based EMS protocol cache):`
          : `Unable to reach local Ollama AI engine (${err.message || 'offline'}). For immediate emergency field directives, please consult your standard protocol cards or contact Medical Direction via dispatch radio.`,
        protocol: fallbackMatch,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (id, content) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'assistant',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Clinical reference session cleared. Select an active EMS protocol chip below or type a query.`,
        protocol: null,
      },
    ]);
  };

  return (
    <div className="page" style={{ maxWidth: '1100px', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>EMS Clinical Protocol Assistant</h1>
            <span className="badge badge-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Stethoscope size={14} aria-hidden="true" /> Active Operational Standard
            </span>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
            On-device clinical decision support engine for field paramedics, emergency medical technicians, and dispatch triage.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleReset}
          title="Clear Session History"
        >
          <RotateCcw size={14} aria-hidden="true" /> Clear History
        </button>
      </div>

      {/* Clinical Disclaimer Banner */}
      <div
        style={{
          background: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border)',
          borderLeft: '4px solid var(--primary)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '14px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}
      >
        <ShieldAlert size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
        <div>
          <strong style={{ color: 'var(--text-main)', display: 'block' }}>
            CLINICAL DECISION SUPPORT & GOVERNANCE NOTICE:
          </strong>
          This assistant provides evidence-based protocol reference based on NREMT and state EMS directives. It is intended for qualified emergency responders as real-time decision support and does not supersede direct Medical Control orders.
        </div>
      </div>

      {/* Quick Protocol Selector Chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '10px', flexShrink: 0 }}>
        {Object.values(CLINICAL_PROTOCOLS).map((proto) => (
          <button
            key={proto.chip}
            type="button"
            className="btn btn-ghost btn-sm"
            style={{
              whiteSpace: 'nowrap',
              fontSize: '0.78rem',
              padding: '6px 12px',
              borderRadius: '9999px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
            onClick={() => handleChipClick(proto)}
          >
            <Zap size={13} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            {proto.chip}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div
        className="card"
        style={{
          flex: 1,
          overflowY: 'auto',
          marginTop: 0,
          marginBottom: '14px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'var(--bg-surface)',
        }}
      >
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                flexDirection: isUser ? 'row-reverse' : 'row',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isUser ? 'var(--primary)' : 'var(--teal-subtle, rgba(20, 184, 166, 0.2))',
                  color: isUser ? '#fff' : 'var(--primary)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                {isUser ? <User size={16} aria-hidden="true" /> : <Bot size={16} aria-hidden="true" />}
              </div>

              {/* Bubble */}
              <div
                style={{
                  maxWidth: '75%',
                  background: isUser ? 'var(--primary)' : 'var(--bg-surface-subtle)',
                  color: isUser ? '#ffffff' : 'var(--text-main)',
                  borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  border: isUser ? 'none' : '1px solid var(--border)',
                  padding: '12px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.85 }}>
                      {isUser ? user.fullName : 'EMS Clinical Assistant'}
                    </span>
                    {!isUser && m.model && (
                      <span className="telemetry-tag" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                        {m.model} {m.generationMs ? `(${m.generationMs}ms)` : ''}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{m.time}</span>
                </div>

                <div style={{ fontSize: '0.9rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>

                {/* Structured Protocol Render */}
                {m.protocol && (
                  <div
                    style={{
                      marginTop: '12px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className={`badge ${m.protocol.urgency === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                        {m.protocol.urgency} PRIORITY PROTOCOL
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        onClick={() => handleCopy(m.id, m.protocol.content)}
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check size={12} style={{ color: 'var(--ok)' }} aria-hidden="true" /> Copied
                          </>
                        ) : (
                          <>
                            <Clipboard size={12} aria-hidden="true" /> Copy Protocol
                          </>
                        )}
                      </button>
                    </div>

                    <div
                      style={{
                        fontSize: '0.86rem',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'system-ui, sans-serif',
                        color: 'var(--text-main)',
                      }}
                    >
                      {m.protocol.content}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--teal-subtle, rgba(20, 184, 166, 0.2))',
                color: 'var(--primary)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Bot size={16} aria-hidden="true" />
            </div>
            <div style={{ background: 'var(--bg-surface-subtle)', padding: '8px 14px', borderRadius: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Synthesizing clinical directives...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ display: 'flex', gap: '10px' }}
      >
        <input
          type="text"
          className="form-control"
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-main)',
            fontSize: '0.92rem',
          }}
          placeholder="Ask a clinical protocol question (e.g., Anaphylaxis dosing, START triage rules)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '0 20px', borderRadius: '8px' }}
          disabled={!input.trim()}
        >
          <Send size={16} aria-hidden="true" /> Query
        </button>
      </form>
    </div>
  );
}
