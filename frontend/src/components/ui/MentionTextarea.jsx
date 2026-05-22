import { useState, useRef, useEffect } from "react";
import Avatar from "./Avatar";

export default function MentionTextarea({
  value,
  onChange,
  users = [],
  teams = [],
  placeholder = "",
  rows = 3,
  className = "",
  onEnter = null,
}) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);

  const filteredUsers = users
    .filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
    .slice(0, 5);

  const filteredTeams = teams
    .filter((t) =>
      t.teamName.toLowerCase().includes(mentionQuery.toLowerCase()),
    )
    .slice(0, 5);

  const allOptions = [
    ...filteredUsers.map((u) => ({
      type: "user",
      id: u.userId,
      name: u.name,
      item: u,
    })),
    ...filteredTeams.map((t) => ({
      type: "team",
      id: t._id,
      name: t.teamName,
      item: t,
    })),
  ];

  useEffect(() => {
    if (selectedIndex >= allOptions.length) {
      setSelectedIndex(0);
    }
  }, [allOptions.length]);

  const handleKeyDown = (e) => {
    if (showMentions && allOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % allOptions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) => (prev - 1 + allOptions.length) % allOptions.length,
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(allOptions[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    onChange(val);
    setCursorPos(pos);

    const lastAtPos = val.lastIndexOf("@", pos - 1);
    if (lastAtPos !== -1) {
      const textAfterAt = val.substring(lastAtPos + 1, pos);
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (option) => {
    const val = value;
    const pos = cursorPos;
    const lastAtPos = val.lastIndexOf("@", pos - 1);

    const newVal =
      val.substring(0, lastAtPos) +
      "@" +
      option.name +
      " " +
      val.substring(pos);

    onChange(newVal);
    setShowMentions(false);

    // Set focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = lastAtPos + option.name.length + 2;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        className={className}
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />

      {showMentions && allOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden py-1"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-textMuted uppercase tracking-wider bg-gray-50 border-b border-gray-100">
            Mentions
          </div>
          <div className="max-h-60 overflow-y-auto">
            {allOptions.map((opt, idx) => (
              <button
                key={`${opt.type}-${opt.id}`}
                type="button"
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${idx === selectedIndex ? "bg-primary/5" : "hover:bg-gray-50"}`}
                onClick={() => insertMention(opt)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                {opt.type === "user" ? (
                  <Avatar user={opt.item} size="xs" />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                    T
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-textMain truncate">
                    {opt.name}
                  </div>
                  <div className="text-[10px] text-textMuted uppercase">
                    {opt.type === "user" ? "User" : "Team"}
                  </div>
                </div>
                {idx === selectedIndex && (
                  <span className="text-[10px] text-primary font-bold">
                    Enter
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
