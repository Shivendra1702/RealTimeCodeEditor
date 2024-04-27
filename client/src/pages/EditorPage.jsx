import React, { useState, useRef, useEffect } from "react";
import Client from "../components/Client";
import Editor from "../components/Editor";
import {
  useLocation,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";
import { initSocket } from "../socket";
import { ACTIONS } from "../actions";
import { toast } from "react-hot-toast";

const EditorPage = () => {
  const [clients, setClients] = useState([]);

  const { roomId } = useParams();
  const location = useLocation();
  const reactNavigate = useNavigate();

  const socketRef = useRef(null);
  const codeRef = useRef(null);

  const handleErrors = (err) => {
    toast.error("An error occurred. Please try again later.");
    reactNavigate("/");
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy room ID. Please try again later.");
    }
  };

  const leaveRoom = () => {
    socketRef.current.disconnect();
    reactNavigate("/");
  };

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();

      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username != location.state?.username) {
            toast.success(`${username} joined the room!`);
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room!`);
        setClients((clients) =>
          clients.filter((client) => client.socketId !== socketId)
        );
      });
    };
    init();

    return () => {
      socketRef.current.off(ACTIONS.DISCONNECTED);
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.disconnect();
    };
  }, []);

  if (!location.state) {
    return <Navigate to="/" />;
  }

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
          <button className="btn copyBtn" onClick={copyRoomId}>
            Copy Room ID
          </button>
          <button className="btn leaveBtn" onClick={leaveRoom}>
            Leave Room
          </button>
        </div>
      </div>
      <div className="editorWrap">
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => {
            codeRef.current = code;
          }}
        />
      </div>
    </div>
  );
};

export default EditorPage;
