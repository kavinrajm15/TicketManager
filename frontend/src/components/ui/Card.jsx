export default function Card({
  children,
  className = "",
  hover = false,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-100 shadow-sm
        ${hover ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}
        transition-all duration-200
        ${className}
      `}
    >
      {children}
    </div>
  );
}
