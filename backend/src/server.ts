import app from "./app.js";
import { startNotificationWorker } from "./services/notificationWorker.service.js";

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  startNotificationWorker();
});
