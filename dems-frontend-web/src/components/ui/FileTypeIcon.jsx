import React from 'react';
import {
  Archive,
  File,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo
} from 'lucide-react';
import { fileCategory } from '../../utils/format.js';

const CONFIG = {
  image: { Icon: FileImage, className: 'bg-brand-soft text-brand' },
  video: { Icon: FileVideo, className: 'bg-[#F3EEFF] text-[#6B46C1]' },
  audio: { Icon: FileAudio, className: 'bg-warn-soft text-warn' },
  pdf: { Icon: FileText, className: 'bg-danger-soft text-danger' },
  document: { Icon: FileText, className: 'bg-brand-soft text-brand' },
  spreadsheet: { Icon: FileSpreadsheet, className: 'bg-success-soft text-success' },
  archive: { Icon: Archive, className: 'bg-surface text-ink-muted' },
  file: { Icon: File, className: 'bg-surface text-ink-muted' }
};

export default function FileTypeIcon({ mimeType, fileName, size = 'md' }) {
  const category = fileCategory(mimeType, fileName);
  const config = CONFIG[category] || CONFIG.file;
  const Icon = config.Icon;

  const dimensions = size === 'sm' ? 'h-7 w-7 rounded-[7px]' : 'h-9 w-9 rounded-[9px]';
  const iconSize = size === 'sm' ? 13 : 16;

  return (
    <span
      className={`grid shrink-0 place-items-center ${dimensions} ${config.className}`}
      aria-hidden="true"
      title={mimeType || category}
    >
      <Icon size={iconSize} strokeWidth={1.9} />
    </span>
  );
}
