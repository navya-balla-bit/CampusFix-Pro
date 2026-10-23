const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const resultsFile = path.join(__dirname, "results.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readResults() {
  try {
    if (!fs.existsSync(resultsFile)) {
      return [];
    }

    return JSON.parse(fs.readFileSync(resultsFile, "utf8"));
  } catch (error) {
    console.error("Could not read results:", error.message);
    return [];
  }
}

app.get("/api/results", (req, res) => {
  res.json({
    success: true,
    results: readResults()
  });
});

app.post("/api/results", (req, res) => {
  const { examId, examTitle, score, total, percentage, answered } = req.body;

  if (
    !Number.isInteger(examId) ||
    typeof examTitle !== "string" ||
    !Number.isInteger(score) ||
    !Number.isInteger(total) ||
    !Number.isInteger(percentage) ||
    !Number.isInteger(answered) ||
    total <= 0 ||
    score < 0 ||
    score > total ||
    answered < 0 ||
    answered > total
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid exam result."
    });
  }

  const results = readResults();

  const result = {
    id: Date.now(),
    examId,
    examTitle,
    score,
    total,
    percentage,
    answered,
    submittedAt: new Date().toISOString()
  };

  results.push(result);

  try {
    fs.writeFileSync(
      resultsFile,
      JSON.stringify(results, null, 2),
      "utf8"
    );

    res.status(201).json({
      success: true,
      message: "Exam result saved successfully!",
      result
    });
  } catch (error) {
    console.error("Could not save result:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not save exam result."
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ExamForge API is running!",
    version: "1.0.0"
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("================================");
  console.log("ExamForge server is running!");
  console.log(`Website: http://localhost:${PORT}/`);
  console.log(`Results API: http://localhost:${PORT}/api/results`);
  console.log("================================");
});