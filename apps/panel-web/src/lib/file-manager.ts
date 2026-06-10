import type { LucideIcon } from 'lucide-react';
import {
  Braces,
  File,
  FileCode2,
  FileImage,
  FileText,
  Folder,
  Settings2,
} from 'lucide-react';

export interface FileEntry {
  name: string;
  directory: boolean;
  size?: number;
  mime?: string;
  modified?: string;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function fileBaseName(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function countLines(text: string): number {
  if (!text) return 1;
  return text.split('\n').length;
}

const CODE_EXTENSIONS = new Set([
  'js',
  'jsx',
  'ts',
  'tsx',
  'lua',
  'py',
  'php',
  'sh',
  'bash',
  'cfg',
  'conf',
  'xml',
  'html',
  'css',
  'scss',
  'sql',
  'go',
  'rs',
  'yaml',
  'yml',
  'toml',
  'md',
  'txt',
  'log',
  'properties',
  'env',
  'ini',
]);

export function getFileIcon(name: string, isDirectory: boolean): LucideIcon {
  if (isDirectory) return Folder;

  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined;
  if (ext === 'json') return Braces;
  if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) return FileImage;
  if (ext && ['yml', 'yaml', 'toml', 'ini', 'cfg', 'conf', 'env'].includes(ext)) return Settings2;
  if (ext && CODE_EXTENSIONS.has(ext)) return FileCode2;
  if (ext && ['txt', 'md', 'log'].includes(ext)) return FileText;
  return File;
}

const ARCHIVE_EXTENSIONS = ['zip', 'tar', 'gz', 'tgz', 'rar', '7z', 'bz2', 'xz', 'zst'];

export function isArchive(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tar.bz2') || lower.endsWith('.tar.xz')) return true;
  const ext = lower.includes('.') ? lower.split('.').pop() : undefined;
  return !!ext && ARCHIVE_EXTENSIONS.includes(ext);
}

export function fileTypeLabel(name: string, isDirectory: boolean): string {
  if (isDirectory) return 'Folder';
  const ext = name.includes('.') ? name.split('.').pop()?.toUpperCase() : undefined;
  return ext ? `${ext} file` : 'File';
}

export function sortFileEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort(
    (a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

export function filterFileEntries(entries: FileEntry[], query: string): FileEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((entry) => entry.name.toLowerCase().includes(q));
}
