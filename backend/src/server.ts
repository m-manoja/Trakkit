import express from "express";
import authRoutes from "./routes/auth";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());            // allow frontend to call backend
app.use(express.json());    // parse JSON requests

// Auth routes
app.use("/api/auth", authRoutes);

// Health check route
app.get("/", (req, res) => {
  res.send("🚀 API is working!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
