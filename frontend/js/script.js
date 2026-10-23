
"use strict";

const STORAGE_KEY = "campusFixProIssues";

const form = document.getElementById("issueForm");
const issueTable = document.getElementById("issueTable");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const progressCount = document.getElementById("progressCount");
const resolvedCount = document.getElementById("resolvedCount");
const resultCount = document.getElementById("resultCount");

const resolutionRate = document.getElementById("resolutionRate");
const resolutionBar = document.getElementById("resolutionBar");

let issues = loadIssues();
let statusChart = null;
let priorityChart = null;

function loadIssues() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveIssues() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function createId() {
  return window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStatusClass(status) {
  return ({
    "Pending": "pending",
    "In Progress": "in-progress",
    "Resolved": "resolved"
  })[status] || "pending";
}

function getPriorityClass(priority) {
  return ({
    "Low": "low",
    "Medium": "medium",
    "High": "high"
  })[priority] || "low";
}

function renderIssues() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  const filteredIssues = issues.filter(issue => {
    const searchableText = [
      issue.title,
      issue.category,
      issue.location,
      issue.description,
      issue.priority,
      issue.status
    ].join(" ").toLowerCase();

    const matchesSearch = searchableText.includes(searchTerm);
    const matchesStatus =
      selectedStatus === "All" || issue.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  if (filteredIssues.length === 0) {
    issueTable.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          ${issues.length === 0
            ? "No issues reported yet. Create your first report below!"
            : "No issues match your search or filter."}
        </td>
      </tr>`;
  } else {
    issueTable.innerHTML = filteredIssues.map(issue => `
      <tr>
        <td>
          <div class="issue-title">${escapeHTML(issue.title)}</div>
          <div class="issue-description">
            ${escapeHTML(issue.description)}
          </div>
        </td>
        <td>${escapeHTML(issue.category)}</td>
        <td>${escapeHTML(issue.location)}</td>
        <td>
          <span class="priority-badge ${getPriorityClass(issue.priority)}">
            ${escapeHTML(issue.priority)}
          </span>
        </td>
        <td>
          <div class="admin-actions">
            <select
              class="status-select"
              aria-label="Update status for ${escapeHTML(issue.title)}"
              data-status-id="${escapeHTML(issue.id)}"
            >
              ${["Pending", "In Progress", "Resolved"].map(status => `
                <option value="${status}"
                  ${issue.status === status ? "selected" : ""}>
                  ${status}
                </option>
              `).join("")}
            </select>
            <button
              type="button"
              class="delete-btn"
              data-delete-id="${escapeHTML(issue.id)}"
              aria-label="Delete ${escapeHTML(issue.title)}"
            >Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  resultCount.textContent =
    `Showing ${filteredIssues.length} of ${issues.length} issues`;

  updateDashboard();
  updateAnalytics();
}

function updateDashboard() {
  const total = issues.length;
  const pending = issues.filter(i => i.status === "Pending").length;
  const inProgress = issues.filter(i => i.status === "In Progress").length;
  const resolved = issues.filter(i => i.status === "Resolved").length;

  totalCount.textContent = total;
  pendingCount.textContent = pending;
  progressCount.textContent = inProgress;
  resolvedCount.textContent = resolved;
}

function updateAnalytics() {
  const total = issues.length;
  const resolved = issues.filter(i => i.status === "Resolved").length;
  const rate = total === 0 ? 0 : Math.round((resolved / total) * 100);

  resolutionRate.textContent = `${rate}%`;
  resolutionBar.style.width = `${rate}%`;

  if (typeof Chart === "undefined") {
    console.warn("Chart.js could not load. Analytics charts are unavailable.");
    return;
  }

  const statusData = [
    issues.filter(i => i.status === "Pending").length,
    issues.filter(i => i.status === "In Progress").length,
    resolved
  ];

  const priorityData = [
    issues.filter(i => i.priority === "Low").length,
    issues.filter(i => i.priority === "Medium").length,
    issues.filter(i => i.priority === "High").length
  ];

  const statusCanvas = document.getElementById("statusChart");
  const priorityCanvas = document.getElementById("priorityChart");

  if (statusCanvas) {
    if (statusChart) {
      statusChart.data.datasets[0].data = statusData;
      statusChart.update();
    } else {
      statusChart = new Chart(statusCanvas, {
        type: "doughnut",
        data: {
          labels: ["Pending", "In Progress", "Resolved"],
          datasets: [{
            data: statusData,
            backgroundColor: ["#f59e0b", "#3b82f6", "#10b981"],
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom"
            }
          }
        }
      });
    }
  }

  if (priorityCanvas) {
    if (priorityChart) {
      priorityChart.data.datasets[0].data = priorityData;
      priorityChart.update();
    } else {
      priorityChart = new Chart(priorityCanvas, {
        type: "bar",
        data: {
          labels: ["Low", "Medium", "High"],
          datasets: [{
            label: "Number of Issues",
            data: priorityData,
            backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
            borderRadius: 7,
            maxBarThickness: 48
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const title = document.getElementById("issueTitle").value.trim();
  const category = document.getElementById("issueCategory").value;
  const location = document.getElementById("issueLocation").value.trim();
  const priority = document.getElementById("issuePriority").value;
  const description = document.getElementById("issueDescription").value.trim();

  if (!title || !category || !location || !priority || !description) {
    alert("Please fill in all required fields.");
    return;
  }

  const newIssue = {
    id: createId(),
    title,
    category,
    location,
    priority,
    description,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  issues.unshift(newIssue);
  saveIssues();
  form.reset();
  renderIssues();

  alert("Issue reported successfully!");
  document.getElementById("issues").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

searchInput.addEventListener("input", renderIssues);
statusFilter.addEventListener("change", renderIssues);

issueTable.addEventListener("change", event => {
  const select = event.target.closest("[data-status-id]");
  if (!select) return;

  const issue = issues.find(i => i.id === select.dataset.statusId);
  if (!issue) return;

  issue.status = select.value;
  saveIssues();
  renderIssues();
});

issueTable.addEventListener("click", event => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;

  const issue = issues.find(i => i.id === button.dataset.deleteId);
  if (!issue) return;

  if (!confirm(`Delete "${issue.title}"? This cannot be undone.`)) {
    return;
  }

  issues = issues.filter(i => i.id !== issue.id);
  saveIssues();
  renderIssues();
});

form.addEventListener("reset", () => {
  // Let the browser reset form fields normally.
});

renderIssues();
