import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Lobby from "./pages/Lobby.jsx";
import Admin from "./pages/Admin.jsx";
import SuperAdmin from "./pages/SuperAdmin.jsx";
import TestBed from "./pages/TestBed.jsx";
import { LobbyProvider } from "./lib/LobbyContext.jsx";
import RulesPanel from "./components/RulesPanel.jsx";

export default function App() {
  return (
    <>
      <RulesPanel />
      <Routes>
        <Route path="/super-admin" element={<SuperAdmin />} />
        <Route path="/test" element={<TestBed />} />
        <Route
          path="*"
          element={
            <LobbyProvider>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/lobby/:code" element={<Lobby />} />
                <Route path="/lobby/:code/admin" element={<Admin />} />
              </Routes>
            </LobbyProvider>
          }
        />
      </Routes>
    </>
  );
}
