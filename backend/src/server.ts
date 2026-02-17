import express from "express";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import subscriptionRoutes from "./routes/subscription"; //
import cors from "cors";
import warrantyRoutes from './routes/warranty.route';

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS to allow requests from your mobile app
app.use(cors({
  origin: ['http://localhost:19006', 'http://10.43.147.38:19006', 'exp://10.43.147.38:19000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Logger middleware to track incoming requests from your phone
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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subscriptions", subscriptionRoutes); 
app.use('/api/warranties', warrantyRoutes);

app.get("/", (req, res) => {
  res.send("🚀 API is working!");
});

// Use '0.0.0.0' to ensure the server is discoverable by your mobile device
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server running on http://10.43.147.38:${PORT}`);
});