import { useState, useRef } from 'react';
import { ticketAPI } from '../../services/api';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const BACKEND = 'http://localhost:5000';

function AttachmentItem({ att, onRemove, canRemove, ticketNumber }) {
  const isFile = att.type === 'file';
  // Handle pending vs existing
  const isPending = !!att.isPending;
  let href = '';
  let ext = '';
  
  if (isPending) {
    if (isFile) {
      href = URL.createObjectURL(att.file);
      ext = att.name.split('.').pop()?.toLowerCase();
    } else {
      href = att.url;
    }
  } else {
    href = isFile ? `${BACKEND}${att.url}` : att.url;
    ext = att.name.split('.').pop()?.toLowerCase();
  }
  
  const isImage = ['jpg','jpeg','png','gif','webp'].includes(ext);

  return (
    <div className="group flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100">
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 text-base">
        {isImage ? '🖼' : isFile ? '📄' : '🔗'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <a href={href} target="_blank" rel="noopener noreferrer"
           className="text-sm font-medium text-primary hover:underline truncate block">
          {att.name}
        </a>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-textMuted uppercase tracking-wider font-semibold">
            {isPending ? 'Pending' : (att.size || (isFile ? 'File' : 'Link'))}
          </p>
          {!isPending && att.uploadedBy && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <p className="text-[10px] text-textMuted">
                by <span className="font-medium text-textMain">{att.uploadedBy.name}</span>
              </p>
            </>
          )}
          {!isPending && att.uploadedAt && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <p className="text-[10px] text-textMuted">
                {new Date(att.uploadedAt).toLocaleDateString()}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isPending && (
          <a href={isFile ? `${BACKEND}/api/tickets/${att.ticketNumber || att.ticketId || ticketNumber}/attachments/${att._id}/download?token=${localStorage.getItem('tm_token')}` : href} 
             target="_blank" rel="noopener noreferrer" 
             className="w-7 h-7 rounded-lg flex items-center justify-center text-textMuted hover:bg-primary/10 hover:text-primary transition-colors"
             title={isFile ? 'Download' : 'Open link'}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={isFile
                ? "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                : "M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"}/>
            </svg>
          </a>
        )}
        {canRemove && (
          <button type="button" onClick={() => onRemove(att)}
             className="w-7 h-7 rounded-lg flex items-center justify-center text-textMuted hover:bg-red-50 hover:text-danger transition-colors"
             title="Remove">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function AddAttachment({ ticketNumber, onAdded, onAddPendingFile, onAddPendingLink }) {
  const [tab, setTab] = useState('file'); // 'file' | 'link'
  const [linkForm, setLinkForm] = useState({ name:'', url:'' });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ticketNumber) {
      // Pending mode
      onAddPendingFile(file);
      e.target.value = '';
      return;
    }

    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const { data } = await ticketAPI.addFileAttachment(ticketNumber, fd);
      onAdded(data.ticket);
      toast.success('File attached!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleLink = async () => {
    if (!linkForm.name || !linkForm.url) { toast.error('Name and URL required'); return; }
    
    if (!ticketNumber) {
      // Pending mode
      onAddPendingLink(linkForm);
      setLinkForm({ name:'', url:'' });
      return;
    }

    setUploading(true);
    try {
      const { data } = await ticketAPI.addLinkAttachment(ticketNumber, linkForm);
      onAdded(data.ticket);
      toast.success('Link added!');
      setLinkForm({ name:'', url:'' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add link');
    } finally { setUploading(false); }
  };

  return (
    <div className="mt-3 border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50">
      {/* Tab */}
      <div className="flex gap-2 mb-3">
        {[{ t:'file', label:'Upload File' }, { t:'link', label:'Add Link' }].map(({ t, label }) => (
          <button key={t} type="button" onClick={() => setTab(t)}
             className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${tab===t ? 'bg-primary text-white' : 'bg-white text-textMuted border border-gray-200 hover:border-gray-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'file' ? (
        <div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
                 accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar" />
          <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={() => fileRef.current?.click()}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
            {uploading ? 'Uploading…' : 'Choose File'}
          </Button>
          <p className="text-xs text-textMuted mt-1.5">Max 20MB · Images, PDF, Office docs, ZIP</p>
        </div>
      ) : (
        <div className="flex gap-2">
          <input type="text" placeholder="Link name" value={linkForm.name}
                 onChange={(e) => setLinkForm((f) => ({ ...f, name: e.target.value }))}
                 className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input type="url" placeholder="https://…" value={linkForm.url}
                 onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
                 className="flex-[2] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <Button type="button" size="sm" loading={uploading} onClick={handleLink}>Add</Button>
        </div>
      )}
    </div>
  );
}

export default function TicketAttachments({ 
  attachments = [], 
  pendingFiles = [], 
  pendingLinks = [], 
  ticketNumber, 
  onAdded, 
  onRemove,
  onAddPendingFile,
  onAddPendingLink,
  onRemovePendingFile,
  onRemovePendingLink,
  canRemove = true 
}) {
  const [showAdd, setShowAdd] = useState(false);

  const pendingItems = [
    ...pendingFiles.map(f => ({ isPending: true, type: 'file', file: f, name: f.name, id: `pending-f-${f.name}` })),
    ...pendingLinks.map(l => ({ isPending: true, type: 'link', url: l.url, name: l.name, id: `pending-l-${l.name}` }))
  ];

  const allItems = [...attachments, ...pendingItems];

  return (
    <div className="">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-textMain">
          Attachments
          {allItems.length > 0 && (
            <span className="ml-1.5 text-xs bg-gray-100 text-textMuted px-1.5 py-0.5 rounded-full font-medium">
              {allItems.length}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="text-xs text-primary hover:underline font-semibold"
        >
          {showAdd ? 'Cancel' : '+ Add Attachment'}
        </button>
      </div>

      {allItems.length > 0 ? (
        <div className="space-y-2">
          {allItems.map((att) => (
            <AttachmentItem
              key={att._id || att.id}
              att={att}
              ticketNumber={ticketNumber}
              onRemove={() => {
                if (att.isPending) {
                  if (att.type === 'file') onRemovePendingFile(att.file);
                  else onRemovePendingLink(att);
                } else {
                  onRemove(att._id);
                }
              }}
              canRemove={canRemove}
            />
          ))}
        </div>
      ) : !showAdd ? (
        <p className="text-xs text-textMuted italic">No attachments yet — add files or links above.</p>
      ) : null}

      {showAdd && (
        <AddAttachment
          ticketNumber={ticketNumber}
          onAdded={(t) => { onAdded(t); setShowAdd(false); }}
          onAddPendingFile={(f) => { onAddPendingFile?.(f); setShowAdd(false); }}
          onAddPendingLink={(l) => { onAddPendingLink?.(l); setShowAdd(false); }}
        />
      )}
    </div>
  );
}
