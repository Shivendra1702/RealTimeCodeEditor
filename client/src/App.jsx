import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import EditorPage from "./pages/EditorPage";
import "./app.css";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="editor/:roomId" element={<EditorPage />} />
        </Routes>
      </Router>
      <div>
        <Toaster position="top-right" />
      </div>
    </>
  );
}

export default App;
