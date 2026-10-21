import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FileSearch, Search, X } from 'lucide-react';
import { getMyFiles } from '../../api/evidence.js';
import FileTypeIcon from '../ui/FileTypeIcon.jsx';
import StatusBadge from '../StatusBadge.jsx';
import { formatBytes, formatRelativeTime } from '../../utils/format.js';

/**
 * Command-palette style search over the files the signed-in user can already
 * open. It queries the same `/evidence/my-files` endpoint the vault uses, so
 * results never exceed the user's own access scope.
 */
export default function GlobalSearch({ open, onClose, detailsBase = '/citizen/evidence' }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [term, setTerm] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-files', 1, 'search'],
    queryFn: () => getMyFiles(1, 50),
    enabled: open,
    staleTime: 30000
  });

  useEffect(() => {
    if (open) {
      setTerm('');
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const files = useMemo(
    () => [...(data?.quarantine || []), ...(data?.data || [])],
    [data]
  );

  const results = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return files.slice(0, 6);
    return files
      .filter((file) =>
        [file.fileName, file.caseId, file.ipfsCID, file.fileHash]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle))
      )
      .slice(0, 8);
  }, [files, term]);

  if (!open) return null;

  const go = (file) => {
    onClose();
    if (file.isQuarantine) {
      navigate('/officer/pending-reviews');
      return;
    }
    navigate(`${detailsBase}/${file._id}`);
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center px-4 pt-[10vh]">
      <button
        type="button"
        className="absolute inset-0 animate-fade-in bg-[#172033]/35 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close search"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search files"
        className="relative w-full max-w-xl animate-slide-up overflow-hidden rounded-card border border-line bg-card shadow-pop"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search files by name, case ID, CID or hash…"
            className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
            aria-label="Search files"
          />
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 shrink-0 place-items-center rounded text-ink-faint transition hover:bg-surface hover:text-ink"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 rounded-[9px] px-2 py-2">
                  <span className="skeleton h-8 w-8 rounded-[8px]" />
                  <span className="skeleton h-3 flex-1" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <p className="px-3 py-8 text-center text-[13px] text-ink-muted">
              Search is unavailable right now. Please try again.
            </p>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <FileSearch size={22} className="mb-2 text-ink-faint" />
              <p className="text-[13px] font-medium text-ink">
                {files.length ? 'No matching files' : 'No files yet'}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-muted">
                {files.length
                  ? 'Try a different name, case ID, CID or hash.'
                  : 'Upload a file and it will appear here.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {results.map((file) => (
                <li key={file._id}>
                  <button
                    type="button"
                    onClick={() => go(file)}
                    className="flex w-full items-center gap-3 rounded-[9px] px-2 py-2 text-left transition hover:bg-surface"
                  >
                    <FileTypeIcon mimeType={file.mimeType} fileName={file.fileName} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{file.fileName}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-ink-faint">
                        {file.caseId || 'Personal'} · {formatBytes(file.fileSize)} · {formatRelativeTime(file.createdAt)}
                      </span>
                    </span>
                    <StatusBadge status={file.status} />
                    <ArrowRight size={14} className="shrink-0 text-ink-faint" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line bg-[#FBFCFD] px-4 py-2 text-[11.5px] text-ink-faint">
          <span>Showing files you have access to</span>
          <span className="hidden items-center gap-1 sm:flex">
            <span className="kbd">Esc</span> to close
          </span>
        </div>
      </div>
    </div>
  );
}
