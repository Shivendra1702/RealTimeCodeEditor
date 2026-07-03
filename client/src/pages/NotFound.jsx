import { Link } from "react-router-dom";

import { LogoMark } from "../components/common/Logo";

const NotFound = () => (
  <div className="joinScreen">
    <div className="joinScreen__card">
      <LogoMark size={44} />
      <h1>404 — page not found</h1>
      <p>That page doesn&apos;t exist. Rooms live at /editor/&lt;room-id&gt;.</p>
      <Link to="/" className="btn btn--primary">
        Back to home
      </Link>
    </div>
  </div>
);

export default NotFound;
