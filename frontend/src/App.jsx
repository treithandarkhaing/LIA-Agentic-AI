import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import LearningGenerator from "./pages/LearningGenerator.jsx";
import Login from "./pages/Login.jsx";
import MeetingSummarizer from "./pages/MeetingSummarizer.jsx";
import Planner from "./pages/Planner.jsx";
import WellnessCoach from "./pages/WellnessCoach.jsx";
import { ThemeProvider } from "./hooks/useTheme.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/meeting" replace />} />
          <Route path="planner" element={<Planner />} />
          <Route path="meeting" element={<MeetingSummarizer />} />
          <Route path="learning" element={<LearningGenerator />} />
          <Route path="wellness" element={<WellnessCoach />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
