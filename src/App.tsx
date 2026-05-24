import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { LogsPage } from "./pages/LogsPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
      </Routes>
    </Router>
  );
}
