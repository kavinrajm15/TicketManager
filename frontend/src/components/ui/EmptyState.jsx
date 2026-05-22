export default function EmptyState({title, description, action }) {
 return (
 <div className="flex flex-col items-center justify-center py-16 px-4 text-center ">
 
 <h3 className="text-base font-semibold text-textMain mb-1">{title}</h3>
 {description && <p className="text-sm text-textMuted max-w-xs mb-4">{description}</p>}
 {action && <div className="mt-2">{action}</div>}
 </div>
 );
}
