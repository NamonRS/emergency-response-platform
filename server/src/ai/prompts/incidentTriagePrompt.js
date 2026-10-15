export const INCIDENT_TRIAGE_SYSTEM_PROMPT = `You are an expert emergency medical services (EMS) triage and clinical handover specialist for an emergency response platform.
Your task is to analyze an emergency incident and its chronological timeline of field events, then synthesize a structured clinical triage and handover summary for incoming hospital emergency department staff.

CRITICAL SAFETY & CLINICAL INSTRUCTIONS:
1. Rely ONLY on the verified data and logged events provided in the report.
2. DO NOT fabricate injuries, vitals, or interventions not mentioned in the record.
3. If information (such as vital signs or specific injuries) is missing or unverified, state "Not documented" or "Awaiting on-scene assessment".
4. The suggestedHandoverNote MUST follow a standard EMS handover format (e.g. MIST: Mechanism/Medical complaint, Injuries/Illness found, Signs/vitals, Treatment given).
5. Output STRICT JSON ONLY matching the required schema. Do not enclose in markdown code fences or add extraneous conversational commentary.

REQUIRED JSON SCHEMA:
{
  "triageCategory": "Immediate" | "Urgent" | "Delayed" | "Expectant",
  "primaryInjuries": ["array of identified injuries, conditions, or primary complaints"],
  "vitalSignAbnormalities": ["array of abnormal vital signs mentioned or 'Not documented'"],
  "criticalInterventionsDone": ["array of actions, treatments, or field interventions performed"],
  "immediateRisks": ["array of imminent patient risks, environmental hazards, or complications"],
  "suggestedHandoverNote": "Concise structured field-to-hospital handover note (approx 50-150 words)"
}`;

export function buildIncidentTriageUserPrompt({ incident, events, patient }) {
  const eventsList = (events || [])
    .map((e, idx) => {
      let desc = `[${e.createdAt || 'N/A'}] Event #${idx + 1} (${e.eventType}): `;
      if (e.eventType === 'status_change') {
        desc += `Status changed from ${e.oldStatus} to ${e.newStatus}. ${e.body || ''}`;
      } else if (e.eventType === 'assignment') {
        desc += `${e.body || 'Assignment updated'}`;
      } else if (e.eventType === 'patient_linked') {
        desc += `${e.body || 'Patient linked'}`;
      } else {
        desc += `${e.body || ''}`;
      }
      return desc.trim();
    })
    .join('\n');

  const patientSection = patient
    ? `Patient Code: ${patient.patientCode || 'N/A'}
Patient Name: ${patient.fullName || 'N/A'}
Known Conditions: ${patient.conditions?.length ? patient.conditions.join(', ') : 'None documented'}
Known Allergies: ${patient.allergies?.length ? patient.allergies.join(', ') : 'None documented'}`
    : 'No patient record linked yet.';

  return `INCIDENT DETAILS:
Code: ${incident.incidentCode}
Type: ${incident.incidentType}
Severity: ${incident.severity}
Current Status: ${incident.status}
Location: ${incident.locationDescription}
Occurred At: ${incident.occurredAt}
Initial Description: ${incident.description}

LINKED PATIENT INFORMATION:
${patientSection}

CHRONOLOGICAL EVENT TIMELINE:
${eventsList || 'No timeline events recorded yet.'}

Synthesize the clinical triage and handover summary in valid JSON:`;
}

