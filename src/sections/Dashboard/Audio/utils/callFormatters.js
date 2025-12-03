export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

export const formatCallName = (call) => {
  if (!call) return "No call";

  return call.name || call.from_user?.name || call.from || "Unknown Caller";
};

export const formatCallAvatar = (call) => {
  if (!call) return null;

  return call.avatar || call.from_user?.avatar;
};

export const generateEventKey = (roomID, callId) => {
  return `${roomID}_${callId}_${Date.now()}`;
};
