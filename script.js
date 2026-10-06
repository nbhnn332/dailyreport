/**
 * ==========================================================================
 * SYBERCEC — DAILY REPORT
 * Frontend Controller (script.js)
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

let isSubmitting = false;

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

/**
 * Formats a Date object to "DD MMM YYYY" (e.g. "06 OCT 2026")
 */
function updateDatePreview(dateObj) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  datePreview.textContent = `${day} ${month} ${year}`;
}

/**
 * Converts "YYYY-MM-DD" from <input type="date"> to "DD/MM/YYYY" for Google Sheets Column A
 */
function formatToDDMMYYYY(yyyyMmDd) {
  if (!yyyyMmDd) return "";
  const parts = yyyyMmDd.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return yyyyMmDd;
}

/**
 * Initializes default sensible start and end times
 */
function initializeDefaultTimes() {
  if (!startTimeInput.value) {
    startTimeInput.value = "19:00";
  }
  if (!endTimeInput.value) {
    endTimeInput.value = "21:30";
  }
}

/**
 * Formats standard 24-hr time string "HH:mm" to 12-hr format "hh:mm AM/PM"
 */
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

function setupEventListeners() {
  dateInput.addEventListener("change", (e) => {
    if (e.target.value) {
      const [year, month, day] = e.target.value.split("-").map(Number);
      const selectedDate = new Date(year, month - 1, day);
      updateDatePreview(selectedDate);
    }
  });

  form.addEventListener("submit", handleSubmit);
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

    handleSuccessfulSubmission();

  } catch (err) {
    console.warn("Direct fetch failed, falling back to hidden iframe form POST:", err);
    submitViaHiddenIframe(formattedDate, taskValue, formattedStartTime, formattedEndTime);
  } finally {
    setSubmittingState(false);
  }
}

function submitViaHiddenIframe(date, task, startTime, endTime) {
  try {
    const tempForm = document.createElement("form");
    tempForm.method = "POST";
    tempForm.action = SCRIPT_URL;
    tempForm.target = "hidden_submission_iframe";
    tempForm.style.display = "none";

    const fields = { date, task, startTime, endTime };
    for (const [key, val] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = val;
      tempForm.appendChild(input);
    }

    document.body.appendChild(tempForm);
    tempForm.submit();
    setTimeout(() => {
      document.body.removeChild(tempForm);
      handleSuccessfulSubmission();
    }, 1200);

  } catch (fallbackErr) {
    console.error("Submission failed:", fallbackErr);
    showStatus("Unable to save report. Please try again.", "error");
    setSubmittingState(false);
  }
}

function handleSuccessfulSubmission() {
  showStatus("✓ Report saved successfully", "success");
  taskInput.value = "";
}

function setSubmittingState(submitting) {
  isSubmitting = submitting;
  submitBtn.disabled = submitting;
  if (submitting) {
    btnText.textContent = "SAVING...";
    btnSpinner.style.display = "inline-block";
  } else {
    btnText.textContent = "SAVE REPORT";
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
    }, 6000);
  }
}

function hideStatus() {
  statusMessage.style.display = "none";
}
