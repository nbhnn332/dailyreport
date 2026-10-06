/**
 * ==========================================================================
 * SYBERCEC — DAILY REPORT
 * Frontend Controller (script.js)
 * Supports: Add, Edit, and Delete reports directly with Google Sheets
 * ==========================================================================
 */

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw4iZMKVfsYtDk8UWs-935v3ws81-LQsa2fAFd0UZ1WQG6Chz70hp0cLONz8SbByXXN/exec";

// Authentication
const PASS_KEY = "212113";
const AUTH_STORAGE_KEY = "sybercec_auth_token";

// DOM Elements - Auth
const loginModal = document.getElementById("login-modal");
const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("password-input");
const loginError = document.getElementById("login-error");
const appContainer = document.getElementById("app-container");
const logoutBtn = document.getElementById("logout-btn");

// DOM Elements - App
const form = document.getElementById("daily-report-form");
const dateInput = document.getElementById("date-input");
const datePreview = document.getElementById("date-preview");
const taskInput = document.getElementById("task-input");
const startTimeInput = document.getElementById("start-time-input");
const endTimeInput = document.getElementById("end-time-input");
const submitBtn = document.getElementById("submit-btn");
const btnText = document.getElementById("btn-text");
const btnSpinner = document.getElementById("btn-spinner");
const statusMessage = document.getElementById("status-message");
const statusIcon = document.getElementById("status-icon");
const statusText = document.getElementById("status-text");
const recentList = document.getElementById("recent-list");
const refreshReportsBtn = document.getElementById("refresh-reports-btn");

// DOM Elements - Edit Mode
const editModeBanner = document.getElementById("edit-mode-banner");
const editRowLabel = document.getElementById("edit-row-label");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const editRowInput = document.getElementById("edit-row-input");
const formActionInput = document.getElementById("form-action-input");

let isSubmitting = false;
let currentReportsData = [];

// ==========================================================================
// Initialization & Auth Guard
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  setupAuth();
  initializeDate();
  initializeDefaultTimes();
  setupEventListeners();
});

function setupAuth() {
  const isAuth = sessionStorage.getItem(AUTH_STORAGE_KEY) === "true";
  if (isAuth) {
    showApp();
  } else {
    showLogin();
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const entered = passwordInput.value.trim();
    if (entered === PASS_KEY) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
      loginError.style.display = "none";
      showApp();
    } else {
      loginError.style.display = "flex";
      passwordInput.value = "";
      passwordInput.focus();
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      showLogin();
    });
  }
}

function showLogin() {
  loginModal.style.display = "flex";
  appContainer.style.display = "none";
  passwordInput.value = "";
  setTimeout(() => passwordInput.focus(), 100);
}

function showApp() {
  loginModal.style.display = "none";
  appContainer.style.display = "flex";
  loadRecentReports();
  taskInput.focus();
}

/**
 * Initializes the date input with today's date in YYYY-MM-DD
 */
function initializeDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  
  dateInput.value = `${yyyy}-${mm}-${dd}`;
  updateDatePreview(today);
}

function updateDatePreview(dateObj) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  datePreview.textContent = `${day} ${month} ${year}`;
}

function formatToDDMMYYYY(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  const parts = yyyyMmDd.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return yyyyMmDd;
}

function parseDDMMYYYYtoInputDate(ddMmYyyy) {
  if (!ddMmYyyy) return "";
  const parts = ddMmYyyy.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return ddMmYyyy;
}

function initializeDefaultTimes() {
  if (!startTimeInput.value) {
    startTimeInput.value = "19:00";
  }
  if (!endTimeInput.value) {
    endTimeInput.value = "21:30";
  }
}

function formatTo12Hour(time24) {
  if (!time24) return "";
  const parts = time24.split(":");
  if (parts.length < 2) return time24;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, "0");
  return `${formattedHours}:${minutes} ${ampm}`;
}

function parse12HourToTimeInput(time12) {
  if (!time12) return "";
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return "";
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3] ? match[3].toUpperCase() : "";

  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function setupEventListeners() {
  dateInput.addEventListener("change", (e) => {
    if (e.target.value) {
      const [year, month, day] = e.target.value.split("-").map(Number);
      const selectedDate = new Date(year, month - 1, day);
      updateDatePreview(selectedDate);
    }
  });

  form.addEventListener("submit", handleSubmit);

  if (refreshReportsBtn) {
    refreshReportsBtn.addEventListener("click", () => {
      loadRecentReports(true);
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", exitEditMode);
  }
}

// ==========================================================================
// Edit Mode Handling
// ==========================================================================
function startEditReport(report) {
  if (!report) return;

  const inputDate = parseDDMMYYYYtoInputDate(report.date);
  if (inputDate) {
    dateInput.value = inputDate;
    const [y, m, d] = inputDate.split("-").map(Number);
    updateDatePreview(new Date(y, m - 1, d));
  }

  taskInput.value = report.task || "";

  const parsedStart = parse12HourToTimeInput(report.startTime);
  if (parsedStart) startTimeInput.value = parsedStart;

  const parsedEnd = parse12HourToTimeInput(report.endTime);
  if (parsedEnd) endTimeInput.value = parsedEnd;

  editRowInput.value = report.row || "";
  formActionInput.value = "update";
  editRowLabel.textContent = `(${report.date || ""})`;
  editModeBanner.style.display = "flex";
  btnText.textContent = "UPDATE REPORT";

  window.scrollTo({ top: 0, behavior: "smooth" });
  taskInput.focus();
}

function exitEditMode() {
  editRowInput.value = "";
  formActionInput.value = "add";
  editModeBanner.style.display = "none";
  btnText.textContent = "SAVE REPORT";
  taskInput.value = "";
  initializeDate();
  initializeDefaultTimes();
}

// ==========================================================================
// Delete Handling
// ==========================================================================
async function deleteReport(report, cardElement) {
  if (!confirm(`Are you sure you want to delete this report?\n\nDate: ${report.date}\nTask: ${report.task}`)) {
    return;
  }

  if (cardElement) {
    cardElement.style.opacity = "0.4";
    cardElement.style.pointerEvents = "none";
  }

  try {
    const formData = new URLSearchParams();
    formData.append("action", "delete");
    formData.append("row", report.row);

    // Call doPost with delete
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    });

    if (cardElement) cardElement.remove();
    showStatus("✓ Report deleted successfully", "success");

    setTimeout(() => {
      loadRecentReports(false);
    }, 2000);

  } catch (err) {
    console.error("Delete failed:", err);
    showStatus("Unable to delete report. Please try again.", "error");
    if (cardElement) {
      cardElement.style.opacity = "1";
      cardElement.style.pointerEvents = "auto";
    }
  }
}

// ==========================================================================
// Form Submission Logic
// ==========================================================================
async function handleSubmit(event) {
  event.preventDefault();

  if (isSubmitting) return;

  const dateValue = dateInput.value;
  const taskValue = taskInput.value.trim();
  const startTimeValue = startTimeInput.value;
  const endTimeValue = endTimeInput.value;
  const actionType = formActionInput.value || "add";
  const targetRow = editRowInput.value;

  hideStatus();

  if (!dateValue) {
    showStatus("Please select a date.", "error");
    dateInput.focus();
    return;
  }

  if (!taskValue) {
    showStatus("Please enter what you studied or completed.", "error");
    taskInput.focus();
    return;
  }

  if (!startTimeValue) {
    showStatus("Please select a start time.", "error");
    startTimeInput.focus();
    return;
  }

  if (!endTimeValue) {
    showStatus("Please select an end time.", "error");
    endTimeInput.focus();
    return;
  }

  const formattedDate = formatToDDMMYYYY(dateValue);
  const formattedStartTime = formatTo12Hour(startTimeValue);
  const formattedEndTime = formatTo12Hour(endTimeValue);

  setSubmittingState(true);

  try {
    const formData = new URLSearchParams();
    formData.append("action", actionType);
    if (actionType === "update" && targetRow) {
      formData.append("row", targetRow);
    }
    formData.append("date", formattedDate);
    formData.append("task", taskValue);
    formData.append("startTime", formattedStartTime);
    formData.append("endTime", formattedEndTime);

    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });

    handleSuccessfulSubmission({
      row: targetRow,
      date: formattedDate,
      task: taskValue,
      startTime: formattedStartTime,
      endTime: formattedEndTime
    }, actionType === "update");

  } catch (err) {
    console.warn("Direct fetch failed, falling back to hidden iframe form POST:", err);
    submitViaHiddenIframe(actionType, targetRow, formattedDate, taskValue, formattedStartTime, formattedEndTime);
  } finally {
    setSubmittingState(false);
  }
}

function submitViaHiddenIframe(action, row, date, task, startTime, endTime) {
  try {
    const tempForm = document.createElement("form");
    tempForm.method = "POST";
    tempForm.action = SCRIPT_URL;
    tempForm.target = "hidden_submission_iframe";
    tempForm.style.display = "none";

    const fields = { action, row, date, task, startTime, endTime };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined && val !== "") {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = val;
        tempForm.appendChild(input);
      }
    }

    document.body.appendChild(tempForm);
    tempForm.submit();
    setTimeout(() => {
      document.body.removeChild(tempForm);
      handleSuccessfulSubmission({ row, date, task, startTime, endTime }, action === "update");
    }, 1200);

  } catch (fallbackErr) {
    console.error("Submission failed:", fallbackErr);
    showStatus("Unable to save report. Please try again.", "error");
    setSubmittingState(false);
  }
}

function handleSuccessfulSubmission(entry, isUpdate = false) {
  showStatus(isUpdate ? "✓ Report updated successfully" : "✓ Report saved successfully", "success");
  
  if (isUpdate) {
    exitEditMode();
  } else {
    taskInput.value = "";
    if (entry) {
      addRecentReportCard(entry, true);
    }
  }

  setTimeout(() => {
    loadRecentReports(false);
  }, 2200);
}

function setSubmittingState(submitting) {
  isSubmitting = submitting;
  submitBtn.disabled = submitting;
  const isEditing = formActionInput.value === "update";
  if (submitting) {
    btnText.textContent = isEditing ? "UPDATING..." : "SAVING...";
    btnSpinner.style.display = "inline-block";
  } else {
    btnText.textContent = isEditing ? "UPDATE REPORT" : "SAVE REPORT";
    btnSpinner.style.display = "none";
  }
}

function showStatus(message, type) {
  statusMessage.className = `status-banner ${type}`;
  statusText.textContent = message;
  statusIcon.textContent = type === "success" ? "✓" : "⚠";
  statusMessage.style.display = "flex";

  if (type === "success") {
    setTimeout(() => {
      hideStatus();
    }, 5000);
  }
}

function hideStatus() {
  statusMessage.style.display = "none";
}

// ==========================================================================
// Recent Reports Display & Actions
// ==========================================================================
async function loadRecentReports(showAnimation = false) {
  if (!recentList) return;

  if (refreshReportsBtn && showAnimation) {
    refreshReportsBtn.classList.add("rotating");
  }

  try {
    const response = await fetch(`${SCRIPT_URL}?action=getRecent&t=${Date.now()}`);
    if (!response.ok) throw new Error("Fetch error");
    const data = await response.json();
    if (data.status === "success" && Array.isArray(data.reports)) {
      currentReportsData = data.reports;
      renderRecentReports(data.reports);
    } else {
      fetchRecentViaJsonp();
    }
  } catch (err) {
    fetchRecentViaJsonp();
  } finally {
    if (refreshReportsBtn) {
      setTimeout(() => refreshReportsBtn.classList.remove("rotating"), 500);
    }
  }
}

function fetchRecentViaJsonp() {
  const callbackName = "sybercec_cb_" + Date.now();
  const script = document.createElement("script");
  
  window[callbackName] = function(data) {
    try {
      if (data && data.status === "success" && Array.isArray(data.reports)) {
        currentReportsData = data.reports;
        renderRecentReports(data.reports);
      } else {
        renderRecentPlaceholder("No reports recorded yet.");
      }
    } finally {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }
  };

  script.onerror = function() {
    delete window[callbackName];
    if (script.parentNode) script.parentNode.removeChild(script);
    renderRecentPlaceholder("Recent reports will show once recorded.");
  };

  script.src = `${SCRIPT_URL}?action=getRecent&callback=${callbackName}&t=${Date.now()}`;
  document.body.appendChild(script);
}

function renderRecentReports(reports) {
  if (!recentList) return;
  recentList.innerHTML = "";
  if (!reports || reports.length === 0) {
    renderRecentPlaceholder("No reports logged yet. Your submissions will appear here.");
    return;
  }

  reports.forEach(report => {
    addRecentReportCard(report, false);
  });
}

function renderRecentPlaceholder(message) {
  if (!recentList) return;
  recentList.innerHTML = `<div class="recent-empty">${escapeHtml(message)}</div>`;
}

function addRecentReportCard(report, prepend = false) {
  if (!recentList) return;
  const emptyElem = recentList.querySelector(".recent-empty");
  if (emptyElem) emptyElem.remove();

  const card = document.createElement("div");
  card.className = "recent-card";

  const timeFormatted = (report.startTime && report.endTime) 
    ? `${report.startTime} → ${report.endTime}`
    : (report.startTime || report.endTime || "");

  card.innerHTML = `
    <div class="recent-card-top">
      <span class="recent-date">${escapeHtml(report.date || "")}</span>
      <div class="recent-card-top-right">
        ${timeFormatted ? `<span class="recent-time">${escapeHtml(timeFormatted)}</span>` : ""}
        <div class="card-actions">
          <button class="action-btn edit-btn" title="Edit entry" aria-label="Edit">✏️ Edit</button>
          <button class="action-btn delete-btn" title="Delete entry" aria-label="Delete">🗑️</button>
        </div>
      </div>
    </div>
    <div class="recent-task">${escapeHtml(report.task || "")}</div>
  `;

  // Attach Edit and Delete listeners
  const editBtn = card.querySelector(".edit-btn");
  const deleteBtn = card.querySelector(".delete-btn");

  editBtn.addEventListener("click", () => {
    startEditReport(report);
  });

  deleteBtn.addEventListener("click", () => {
    deleteReport(report, card);
  });

  if (prepend && recentList.firstChild) {
    recentList.insertBefore(card, recentList.firstChild);
  } else {
    recentList.appendChild(card);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
