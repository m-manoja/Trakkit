import express from "express";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import subscriptionRoutes from "./routes/subscription";
import cors from "cors";
import warrantyRoutes from './routes/warranty';
import reminderRoutes from './routes/reminder';
import todoRoutes from './routes/todo';
import settingsRoutes from './routes/settings';
import notificationsRoutes from './routes/notifications';
import paymentRoutes from './routes/payment';
import { startNotificationWorker } from './services/notificationWorker.service';

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:19006'];

// Configure CORS to allow requests from your mobile app
app.use(cors({
  origin: CORS_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
app.use('/api/reminders', reminderRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/users', settingsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payment', paymentRoutes);

app.get("/", (req, res) => {
  res.send("API is working!");
});

// Use '0.0.0.0' to ensure the server is discoverable by your mobile device
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on http://${HOST}:${PORT}`);

  // Start the background notification worker
  startNotificationWorker();
});