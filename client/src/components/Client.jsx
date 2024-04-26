import React from "react";
import Avatar from "react-avatar";

const Client = ({ username }) => {
  return (
    <div className="client">
      <Avatar name={username} size={35} round="14px" />
      <div className="clientName">{username}</div>
    </div>
  );
};

export default Client;
