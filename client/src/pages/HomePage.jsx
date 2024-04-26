import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuid();
    setRoomId(id);
    toast.success("New Room Created");
  };

  const joinRoom = async (e) => {
    e.preventDefault();
    if (!roomId || !username) {
      toast.error("Please fill all fields");
      return;
    }
    navigate(`/editor/${roomId}`, {
      state: {
        username: username,
      },
    });
  };

  return (
    <div className="homePageWrapper">
      <div className="formWrapper">
        <div>
          <h1>
            Code <span className="titleSpan">Together</span>
          </h1>
          <p className="titleP">Real Time Code Editor ...</p>
        </div>

        <form onSubmit={joinRoom} className="inputGroup">
          <input
            type="text"
            placeholder="Enter ROOM-ID"
            className="inputBox"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Enter Username"
            className="inputBox"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button type="submit" className="btn joinBtn">
            Join
          </button>
        </form>

        <div className="newIdDiv">
          <p>
            If You Dont have an invite then create{" "}
            <span onClick={createNewRoom} className="newMsg">
              New Room
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
