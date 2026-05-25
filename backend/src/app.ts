import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import subscriptionRoutes from "./routes/subscription.js";
import warrantyRoutes from "./routes/warranty.js";
import reminderRoutes from "./routes/reminder.js";
import todoRoutes from "./routes/todo.js";
import settingsRoutes from "./routes/settings.js";
import notificationsRoutes from "./routes/notifications.js";
import paymentRoutes from "./routes/payment.js";
import googleCalendarRoutes from "./routes/googleCalendar.js";
import sharingRoutes from "./routes/sharing.js";

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:19006"];

const app = express();

app.use(
  cors({
    origin: CORS_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

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

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/warranties", warrantyRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/users", settingsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/google-calendar", googleCalendarRoutes);
app.use("/api/sharing", sharingRoutes);

app.get("/", (_req, res) => {
  res.send("API is working!");
});

export default app;
