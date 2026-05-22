const variants = {
  primary:   'bg-primary text-white hover:bg-blue-700 shadow-sm',
  secondary: 'bg-white text-textMain border border-gray-200 hover:bg-gray-50 shadow-sm',
  ghost:     'bg-transparent text-textMuted hover:bg-gray-100',
  danger:    'bg-danger text-white hover:bg-red-600 shadow-sm',
  success:   'bg-success text-white hover:bg-emerald-600 shadow-sm',
};

const sizes = {
  xs:  'px-2.5 py-1   text-xs  gap-1',
  sm:  'px-3   py-1.5 text-sm  gap-1.5',
  md:  'px-4   py-2   text-sm  gap-2',
  lg:  'px-5   py-2.5 text-base gap-2',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-150 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-primary/40
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
