import React from "react";

const HomePage = () => {
  return (
    <div className="homePageWrapper">
      <div className="formWrapper">
        <div>
          <h1>
            Code <span className="titleSpan">Together</span>
          </h1>
          <p className="titleP">Real Time Code Editor ...</p>
        </div>
        <div className="inputGroup">
          <input type="text" placeholder="Enter ROOM-ID" className="inputBox" />
          <input
            type="text"
            placeholder="Enter Username"
            className="inputBox"
          />
          <button className="btn joinBtn">Join</button>
        </div>
        <div className="newIdDiv">
          <p>
            If You Dont have an invite then create{" "}
            <span className="newMsg">New Room</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
