import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import Resources from "./pages/Resources";
import Anomalies from "./pages/Anomalies";
import Cost from "./pages/Cost";

function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <div className="ambient-orb orb-blue" />
      <div className="ambient-orb orb-violet" />
      <div className="ambient-orb orb-mint" />
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState("healthy");

  return (
    <BrowserRouter>
      <AmbientBackground />
      <div className="app-shell">
        <Header healthStatus={health} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard onHealthChange={setHealth} />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/anomalies" element={<Anomalies />} />
            <Route path="/cost" element={<Cost />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
