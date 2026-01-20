import express from "express";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());            // allow frontend to call backend
app.use(express.json());    // parse JSON requests
app.use((req, res, next) => {
  const startMs = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - startMs;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`
    );
  });
  next();
});

// Auth routes
app.use("/api/auth", authRoutes);
// User routes
app.use("/api/users", userRoutes);

// Health check route
app.get("/", (req, res) => {
  res.send("🚀 API is working!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
