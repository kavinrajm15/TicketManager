import { useState, useRef, useEffect } from 'react';

export default function ProjectSelect({ projects = [], value = [], onChange, className }) {
  const [isOpen, setIsOpen] = useState(false);
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

  const selectedProjects = projects.filter(p => value.includes(String(p.projectId)));

  const toggleProject = (projectId) => {
    const idStr = String(projectId);
    if (value.includes(idStr)) {
      onChange(value.filter(id => id !== idStr));
    } else {
      onChange([...value, idStr]);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`${className} flex flex-wrap gap-2 items-center p-2 min-h-[42px] bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-primary/50 transition-colors`}
      >
        {selectedProjects.length > 0 ? (
          selectedProjects.map(p => (
            <div key={p.projectId} className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md">
              <span className="text-xs font-bold text-primary">{p.key}</span>
              <span className="text-sm font-medium text-textMain">{p.name}</span>
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); toggleProject(p.projectId); }}
                className="w-4 h-4 rounded-full hover:bg-red-100 text-textMuted hover:text-danger flex items-center justify-center transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <span className="text-sm text-textMuted px-1">Select projects...</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto py-1">
          {projects.length > 0 ? (
            projects.map((p) => {
              const isSelected = value.includes(String(p.projectId));
              return (
                <button
                  key={p.projectId}
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left ${isSelected ? 'bg-blue-50/30' : ''}`}
                  onClick={() => toggleProject(p.projectId)}
                >
                  <div>
                    <div className="text-sm font-semibold text-textMain leading-tight">{p.name}</div>
                    <div className="text-xs text-textMuted font-mono">{p.key}</div>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-sm text-textMuted text-center">No projects available</div>
          )}
        </div>
      )}
    </div>
  );
}
