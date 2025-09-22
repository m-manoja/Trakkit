const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;

const supabase = require("./src/config/supabaseClient");

app.use(express.json());

app.get("/", async (req, res) => {
  // Simple test: fetch something from Supabase
  const { data, error } = await supabase.from("your_table").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
