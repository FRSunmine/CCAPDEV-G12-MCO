// npm install express

const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Serve everything inside /public
app.use(express.static(path.join(__dirname, "public")));

// Endpoint for JSON data
app.get("/restaurants", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "processes", "restaurant_list.json"));
});

// Default route → serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});