import { useState, useRef, useEffect } from 'react';
import Avatar from './Avatar';
import { RoleBadge } from './Badge';

export default function UserMentionSelect({ users = [], value = [], onChange, className }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedUsers = users.filter(u => value.includes(String(u.userId)));
  const availableUsers = users.filter(u => !value.includes(String(u.userId)));

  const searchTerm = query.trim().toLowerCase();
  const filteredUsers = availableUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm) ||
    (u.email && u.email.toLowerCase().includes(searchTerm))
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
  };

  // Open dropdown on focus/click
  const handleFocus = () => {
    setIsOpen(true);
  };

  const selectUser = (user) => {
    onChange([...value, String(user.userId)]);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeUser = (userId) => {
    onChange(value.filter(id => id !== String(userId)));
  };

  // Backspace on empty input → remove last selected user
  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && query === '' && selectedUsers.length > 0) {
      const last = selectedUsers[selectedUsers.length - 1];
      removeUser(last.userId);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Chip container + input */}
      <div
        className={`${className} flex flex-wrap gap-1.5 items-center p-1.5 min-h-[42px] cursor-text`}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedUsers.map((u, idx) => (
          <div
            key={u.userId}
            className="flex items-center gap-1.5 bg-blue-50 border border-primary/20 px-2 py-1 rounded-md group"
            title="Press Backspace to remove"
          >
            <Avatar user={u} size="xs" />
            <span className="text-sm font-medium text-textMain">{u.name}</span>
            <RoleBadge role={u.role} />
            {/* Subtle close button — kept for mouse users, but backspace also works */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeUser(u.userId); }}
              className="ml-0.5 w-4 h-4 rounded-full opacity-40 group-hover:opacity-100 hover:bg-red-100 text-textMuted hover:text-danger flex items-center justify-center transition-all"
              tabIndex={-1}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none focus:ring-0 text-sm px-1 placeholder-gray-400"
          placeholder={selectedUsers.length === 0 ? 'Type a name to assign…' : ''}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto py-1">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <button
                key={u.userId}
                type="button"
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                onClick={() => selectUser(u)}
              >
                <Avatar user={u} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-textMain truncate">{u.name}</span>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="text-xs text-textMuted truncate">{u.email}</div>
                </div>
              </button>
            ))
          ) : (
            availableUsers.length === 0 ? (
              <div className="px-3 py-3 text-sm text-textMuted text-center">All users assigned</div>
            ) : (
              <div className="px-3 py-3 text-sm text-textMuted text-center">No users match "{query}"</div>
            )
          )}
        </div>
      )}
    </div>
  );
}
