import React, { useState } from "react";
import Client from "../components/Client";
import Editor from "../components/Editor";

const EditorPage = () => {
  const [clients, setClients] = useState([
    { socketId: "123", username: "John Doe" },
    { socketId: "124", username: "Ramesh Sharma" },
  ]);
  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logoContainer">
            <h1>
              Code <span className="titleSpan">Together</span>
            </h1>
            <p className="titleP">Real Time Code Editor ...</p>
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <div className="btnContainer">
          <button className="btn copyBtn">Copy Room ID</button>
          <button className="btn leaveBtn">Leave Room</button>
        </div>
      </div>
      <div className="editorWrap">
        <Editor />
      </div>
    </div>
  );
};

export default EditorPage;
