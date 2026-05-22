import { useState, useEffect } from "react";
// Avatar component — shows user photo or generates colored initials
const COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
];

const getColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const sizeMap = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-7 h-7 text-[11px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
  xl: "w-12 h-12 text-base",
  "2xl": "w-16 h-16 text-xl",
};

export default function Avatar({
  user,
  size = "md",
  className = "",
  tooltip = false,
}) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = sizeMap[size] || sizeMap.md;
  const colorClass = getColor(user?.name);
  const initials = getInitials(user?.name || "?");
  
  const photoUrl = user?.photo && !imgError
    ? user.photo.startsWith("http")
      ? user.photo
      : `http://${window.location.hostname}:5000${user.photo}`
    : null;

  // Reset error when user object changes (e.g. new photo uploaded)
  useEffect(() => {
    setImgError(false);
  }, [user?.photo]);

  return (
    <div
      title={tooltip ? user?.name : undefined}
      data-tooltip={tooltip ? user?.name : undefined}
      className={`${sizeClass} ${
        photoUrl ? "" : colorClass
      } rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ring-2 ring-white overflow-hidden ${className}`}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={user?.name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
