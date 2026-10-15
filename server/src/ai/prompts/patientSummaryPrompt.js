export const PATIENT_SUMMARY_SYSTEM_PROMPT = `You are an expert emergency medical services (EMS) clinical documentation specialist.
Your task is to analyze a patient's historical medical record, allergies, current medications, past medical history, and emergency incident history to synthesize a rapid, structured Clinical Medical Brief for front-line responders and triage clinicians.

CRITICAL CLINICAL & SAFETY RULES:
1. NEVER invent allergies, chronic conditions, or medications.
2. Flag potential contraindications or critical drug/allergy interactions based solely on the documented record.
3. If no allergies or conditions are documented, explicitly state "None documented".
4. The emergencyActionProtocol MUST provide high-yield, actionable field instructions for first responders in 1 to 3 clear sentences.
5. Output STRICT JSON ONLY matching the required schema. No markdown fences, no pleasantries, no commentary.

REQUIRED JSON SCHEMA:
{
  "clinicalAlert": "High" | "Medium" | "Low",
  "criticalRisks": ["array of critical risk factors, high-alert medications, or contraindications"],
  "allergiesSummary": ["array of documented allergies and potential reaction severities"],
  "chronicConditionsSummary": ["array of documented chronic conditions"],
  "emergencyActionProtocol": "Concise step-by-step guidance for field responders (max 3 sentences)"
}`;

export function buildPatientSummaryUserPrompt({ patient, incidents }) {
  const conditions = patient.conditions?.length
    ? patient.conditions.join('; ')
    : 'None documented';
  const allergies = patient.allergies?.length
    ? patient.allergies.join('; ')
    : 'None documented';
  const medications = patient.medications?.length
    ? patient.medications.join('; ')
    : 'None documented';

  const incidentsList = (incidents || [])
    .map(
      (inc, idx) =>
        `#${idx + 1}: [${inc.occurredAt || 'N/A'}] ${inc.incidentCode} - ${inc.incidentType} (Severity: ${inc.severity}, Status: ${inc.status})`
    )
    .join('\n');

  return `PATIENT DEMOGRAPHICS & RECORD:
Record ID: ${patient.patientCode || 'N/A'}
Full Name: ${patient.fullName || 'N/A'}
Date of Birth: ${patient.dateOfBirth || 'N/A'}

DOCUMENTED CLINICAL INFORMATION:
Allergies: ${allergies}
Chronic Conditions: ${conditions}
Current Medications: ${medications}
Past Medical History: ${patient.medicalHistory || 'None documented'}

EMERGENCY CONTACT:
${
  patient.emergencyContactName
    ? `${patient.emergencyContactName} (${patient.emergencyContactRelationship || 'Contact'}) - ${patient.emergencyContactPhone || 'No phone'}`
    : 'None documented'
}

PREVIOUS INCIDENT HISTORY:
${incidentsList || 'No previous emergency incidents recorded in the system.'}

Synthesize the patient medical summary strictly in valid JSON matching the schema:`;
}

