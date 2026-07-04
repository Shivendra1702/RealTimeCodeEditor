import Avatar from "../common/Avatar";

/** Roster for the sidebar: self pinned first, typing users marked live. */
const UserList = ({ users, selfId, typingIds }) => {
  const ordered = [...users].sort((a, b) => {
    if (a.socketId === selfId) return -1;
    if (b.socketId === selfId) return 1;
    return a.username.localeCompare(b.username);
  });

  return (
    <ul className="userList" aria-label="People in this room">
      {ordered.map((user) => {
        const isSelf = user.socketId === selfId;
        const isTyping = !isSelf && typingIds.has(user.socketId);
        return (
          <li key={user.socketId} className="userList__item">
            <Avatar name={user.username} color={user.color} typing={isTyping} />
            <span className="userList__name" title={user.username}>
              {user.username}
              {isSelf && <span className="userList__you">you</span>}
            </span>
            {isTyping && <span className="userList__typing">typing…</span>}
          </li>
        );
      })}
    </ul>
  );
};

export default UserList;
