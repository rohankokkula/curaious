/**
 * Google Apps Script for 10p cohort applications
 *
 * Setup:
 * 1. Create a Google Sheet with a tab named "Applications"
 * 2. Paste this script into Extensions → Apps Script
 * 3. Set SHEET_ID and SHARED_SECRET below
 * 4. Deploy as Web App (Execute as: Me, Who has access: Anyone)
 * 5. Copy the deployment URL into GOOGLE_SHEETS_WEBHOOK_URL
 * 6. Copy the same secret into GOOGLE_SHEETS_WEBHOOK_SECRET
 */

const SHEET_ID = "1xkFzJqrSiFMC4JbHUX7xcmRpK-M0v7dI6xFMHoFHljg";
const SHEET_NAME = "Applications";
const SHARED_SECRET = "YB2xOiab84e9Jl0q0pIvxckGF0W5vwSnegPwspDq/So=";

const HEADERS = [
  "application_id",
  "submitted_at",
  "full_name",
  "email",
  "linkedin_url",
  "current_location",
  "hyderabad_availability",
  "current_stage",
  "current_work",
  "ai_journey",
  "currently_learning_or_building",
  "presentation_topic",
  "topic_to_learn",
  "why_join",
  "contribution",
  "weekend_commitment",
  "portfolio_or_project_links",
  "agreement",
  "raw_payload_json",
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ ok: false, error: "missing_body" }, 400);
    }

    const payload = JSON.parse(e.postData.contents);

    if (!payload.secret || payload.secret !== SHARED_SECRET) {
      return jsonResponse({ ok: false, error: "unauthorized" }, 401);
    }

    const sheet = getSheet_();
    ensureHeaders_(sheet);

    const row = [
      payload.application_id || "",
      payload.submitted_at || new Date().toISOString(),
      payload.full_name || "",
      payload.email || "",
      payload.linkedin_url || "",
      payload.current_location || "",
      payload.hyderabad_availability || "",
      payload.current_stage || "",
      payload.current_work || "",
      payload.ai_journey || "",
      payload.currently_learning_or_building || "",
      payload.presentation_topic || "",
      payload.topic_to_learn || "",
      payload.why_join || "",
      payload.contribution || "",
      payload.weekend_commitment || "",
      payload.portfolio_or_project_links || "",
      payload.agreement || "",
      payload.raw_payload_json || JSON.stringify(payload),
    ];

    sheet.appendRow(row);

    return jsonResponse({
      ok: true,
      message: "application saved",
      application_id: payload.application_id || "",
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: "server_error",
        message: String(error),
      },
      500,
    );
  }
}

function doGet() {
  return jsonResponse({
    ok: true,
    message: "10p applications webhook is running",
  });
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    return;
  }

  const existing = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];

  if (existing.join("|") !== HEADERS.join("|")) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function jsonResponse(body, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(body));
  output.setMimeType(ContentService.MimeType.JSON);

  if (statusCode) {
    // Apps Script Web Apps do not expose HTTP status codes directly.
    // The Next.js API route checks response.ok from fetch and JSON body.
  }

  return output;
}
