export function timeAgo(timestamp) {
  if (!timestamp) return "";

  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000); // seconds

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 172800) return "Yesterday";

  return `${Math.floor(diff / 86400)} days ago`;
}
