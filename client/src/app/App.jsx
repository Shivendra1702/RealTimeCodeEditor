import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { TOAST_DURATION_MS } from "../constants/timings";
import EditorPage from "../pages/EditorPage";
import HomePage from "../pages/HomePage";
import NotFound from "../pages/NotFound";

const App = () => (
  <>
    <BrowserRouter>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="/editor/:roomId" element={<EditorPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    <Toaster
      position="bottom-right"
      gutter={10}
      containerStyle={{ bottom: 44 /* clears the editor status bar */ }}
      toastOptions={{
        duration: TOAST_DURATION_MS,
        style: {
          background: "rgba(22, 27, 37, 0.95)",
          color: "#E6EAF2",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
          fontSize: "13.5px",
          padding: "10px 14px",
        },
        success: { iconTheme: { primary: "#34D399", secondary: "#0B0E14" } },
        error: { iconTheme: { primary: "#F87171", secondary: "#0B0E14" } },
      }}
    />
  </>
);

export default App;
