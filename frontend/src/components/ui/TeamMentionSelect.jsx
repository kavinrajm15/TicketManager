import { useState, useRef, useEffect } from 'react';

export default function TeamMentionSelect({ teams = [], value = [], onChange, className }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedTeams = teams.filter(t => value.includes(String(t._id)));
  const availableTeams = teams.filter(t => !value.includes(String(t._id)));

  const searchTerm = query.trim().toLowerCase();
  const filteredTeams = availableTeams.filter(t =>
    t.teamName.toLowerCase().includes(searchTerm)
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const selectTeam = (team) => {
    onChange([...value, String(team._id)]);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeTeam = (teamId) => {
    onChange(value.filter(id => id !== String(teamId)));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace' && query === '' && selectedTeams.length > 0) {
      const last = selectedTeams[selectedTeams.length - 1];
      removeTeam(last._id);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className={`${className} flex flex-wrap gap-1.5 items-center p-1.5 min-h-[42px] cursor-text`}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedTeams.map((t) => (
          <div
            key={t._id}
            className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md group"
            title="Press Backspace to remove"
          >
            <div className="w-5 h-5 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px] uppercase">
              {t.teamName.charAt(0)}
            </div>
            <span className="text-sm font-medium text-textMain">{t.teamName}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTeam(t._id); }}
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
          placeholder={selectedTeams.length === 0 ? 'Type a team name…' : ''}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto py-1">
          {filteredTeams.length > 0 ? (
            filteredTeams.map((t) => (
              <button
                key={t._id}
                type="button"
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectTeam(t)}
              >
                <div className="w-8 h-8 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm uppercase">
                  {t.teamName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-textMain truncate">{t.teamName}</div>
                  <div className="text-xs text-textMuted">{t.members?.length || 0} members</div>
                </div>
              </button>
            ))
          ) : (
            availableTeams.length === 0 ? (
              <div className="px-3 py-3 text-sm text-textMuted text-center">All teams selected</div>
            ) : (
              <div className="px-3 py-3 text-sm text-textMuted text-center">No teams match "{query}"</div>
            )
          )}
        </div>
      )}
    </div>
  );
}
