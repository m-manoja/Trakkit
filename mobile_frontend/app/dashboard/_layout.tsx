// app/dashboard/_layout.tsx
import { Tabs } from "expo-router";

export default function DashboardLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="reminders" options={{ title: "Reminders" }} />
      <Tabs.Screen name="assets" options={{ title: "Assets" }} />
      <Tabs.Screen name="notes" options={{ title: "Notes" }} />
    </Tabs>
  );
}
