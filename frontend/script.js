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
const recentList = document.getElementById("recent-list");
const refreshReportsBtn = document.getElementById("refresh-reports-btn");

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

  if (refreshReportsBtn) {
    refreshReportsBtn.addEventListener("click", () => {
      loadRecentReports(true);
    });
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

    handleSuccessfulSubmission({
      date: formattedDate,
      task: taskValue,
      startTime: formattedStartTime,
      endTime: formattedEndTime
    });

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
      handleSuccessfulSubmission({ date, task, startTime, endTime });
    }, 1200);

  } catch (fallbackErr) {
    console.error("Submission failed:", fallbackErr);
    showStatus("Unable to save report. Please try again.", "error");
    setSubmittingState(false);
  }
}

function handleSuccessfulSubmission(entry) {
  showStatus("✓ Report saved successfully", "success");
  taskInput.value = "";
  
  if (entry) {
    addRecentReportCard(entry, true);
  }

  setTimeout(() => {
    loadRecentReports(false);
  }, 2500);
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

// ==========================================================================
// Recent Reports Display
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
    renderRecentPlaceholder("Recent reports will show once your first entry is added.");
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
      ${timeFormatted ? `<span class="recent-time">${escapeHtml(timeFormatted)}</span>` : ""}
    </div>
    <div class="recent-task">${escapeHtml(report.task || "")}</div>
  `;

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
