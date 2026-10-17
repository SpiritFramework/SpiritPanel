import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { fileBaseName } from '../lib/file-manager';
import { parentPath } from '../lib/paths';
import { getLanguageFromFilename, highlightCode } from '../lib/syntax-highlighter';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const TAB = '\t';
const HIGHLIGHT_LIMIT = 500_000;

export function useFileEditor(serverId: string, filePath: string, canWrite: boolean) {
  const [fileContent, setFileContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lineCount, setLineCount] = useState(1);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findIndex, setFindIndex] = useState(0);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  const dirty = fileContent !== savedContent;
  const fileName = fileBaseName(filePath);
  const language = getLanguageFromFilename(fileName);
  const fileExtension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
  const returnDir = parentPath(filePath);

  const shouldHighlight = fileContent.length < HIGHLIGHT_LIMIT;
  const highlightedTokens = useMemo(
    () =>
      shouldHighlight
        ? highlightCode(fileContent, language)
        : [{ type: 'text' as const, content: fileContent }],
    [fileContent, language, shouldHighlight],
  );

  const findMatchOffsets = useMemo(() => {
    const q = findQuery.trim();
    if (!q) return [] as number[];
    const needle = q.toLowerCase();
    const hay = fileContent.toLowerCase();
    const offsets: number[] = [];
    let pos = 0;
    while (pos < hay.length) {
      const idx = hay.indexOf(needle, pos);
      if (idx === -1) break;
      offsets.push(idx);
      pos = idx + Math.max(1, needle.length);
    }
    return offsets;
  }, [fileContent, findQuery]);

  const findMatches = findMatchOffsets.length;

  const updateLineCount = useCallback((text: string) => {
    setLineCount(Math.max(1, text.split('\n').length));
  }, []);

  const updateCursorFromSelection = useCallback(
    (el: HTMLTextAreaElement) => {
      const pos = el.selectionStart;
      const before = fileContent.slice(0, pos);
      const lines = before.split('\n');
      setCursorLine(Math.max(1, lines.length));
      setCursorCol(Math.max(1, (lines[lines.length - 1]?.length ?? 0) + 1));
    },
    [fileContent],
  );

  const syncScroll = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = editor.scrollTop;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = editor.scrollTop;
      highlightRef.current.scrollLeft = editor.scrollLeft;
    }
  }, []);

  const scrollEditorToPos = useCallback(
    (pos: number) => {
      const el = editorRef.current;
      if (!el) return;
      const style = window.getComputedStyle(el);
      const lineHeight = Number.parseFloat(style.lineHeight) || 20;
      const linesBefore = el.value.slice(0, pos).split('\n').length - 1;
      const target = Math.max(0, linesBefore * lineHeight - el.clientHeight / 3);
      el.scrollTop = target;
      syncScroll();
    },
    [syncScroll],
  );

  const revealFindMatch = useCallback(
    (index: number, opts?: { focusEditor?: boolean }) => {
      const el = editorRef.current;
      const q = findQuery.trim();
      if (!el || !q || findMatchOffsets.length === 0) return;
      const next = ((index % findMatchOffsets.length) + findMatchOffsets.length) % findMatchOffsets.length;
      const start = findMatchOffsets[next]!;
      const end = start + q.length;
      setFindIndex(next);
      el.setSelectionRange(start, end);
      scrollEditorToPos(start);
      updateCursorFromSelection(el);
      if (opts?.focusEditor) el.focus();
    },
    [findMatchOffsets, findQuery, scrollEditorToPos, updateCursorFromSelection],
  );

  const findNext = useCallback(() => {
    if (!findMatchOffsets.length) return;
    revealFindMatch(findIndex + 1);
  }, [findIndex, findMatchOffsets.length, revealFindMatch]);

  const findPrev = useCallback(() => {
    if (!findMatchOffsets.length) return;
    revealFindMatch(findIndex - 1);
  }, [findIndex, findMatchOffsets.length, revealFindMatch]);

  const openFind = useCallback(() => {
    setShowFind(true);
    requestAnimationFrame(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    });
  }, []);

  const closeFind = useCallback(() => {
    setShowFind(false);
    setFindQuery('');
    setFindIndex(0);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  const setFindQueryAndReset = useCallback((value: string) => {
    setFindQuery(value);
    setFindIndex(0);
  }, []);

  useEffect(() => {
    if (!showFind) return;
    const q = findQuery.trim();
    if (!q || findMatchOffsets.length === 0) {
      setFindIndex(0);
      return;
    }
    revealFindMatch(0);
    // Keep focus in the find box while typing.
    requestAnimationFrame(() => findInputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reveal first match when query/content changes
  }, [findQuery, findMatchOffsets, showFind]);

  const loadFile = useCallback(async () => {
    if (!serverId || !filePath) return;
    setLoading(true);
    setFileError(null);
    try {
      const content = await api.client.fileContents(serverId, filePath);
      const text = typeof content === 'string' ? content : String(content);
      setFileContent(text);
      setSavedContent(text);
      updateLineCount(text);
    } catch (e) {
      setFileContent('');
      setSavedContent('');
      setFileError(e instanceof Error ? e.message : 'Failed to load file');
    } finally {
      setLoading(false);
      requestAnimationFrame(() => editorRef.current?.focus());
    }
  }, [serverId, filePath, updateLineCount]);

  useEffect(() => {
    void loadFile();
  }, [loadFile]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const saveFile = useCallback(async () => {
    if (!serverId || !filePath || !canWrite) return false;
    setSaveState('saving');
    setFileError(null);
    try {
      await api.client.writeFile(serverId, filePath, fileContent);
      setSavedContent(fileContent);
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 2000);
      return true;
    } catch (e) {
      setSaveState('error');
      setFileError(e instanceof Error ? e.message : 'Failed to save file');
      return false;
    }
  }, [serverId, filePath, canWrite, fileContent]);

  const revertFile = useCallback(() => {
    setFileContent(savedContent);
    updateLineCount(savedContent);
    setSaveState('idle');
  }, [savedContent, updateLineCount]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (!canWrite) return;
        e.preventDefault();
        void saveFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        openFind();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        if (!showFind || !findMatchOffsets.length) return;
        e.preventDefault();
        if (e.shiftKey) findPrev();
        else findNext();
        return;
      }
      if (e.key === 'Escape' && showFind) {
        e.preventDefault();
        closeFind();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canWrite, closeFind, findMatchOffsets.length, findNext, findPrev, openFind, saveFile, showFind]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setFileContent(text);
    updateLineCount(text);
    updateCursorFromSelection(e.target);
    setSaveState('idle');
    syncScroll();
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab' || !canWrite) return;
    e.preventDefault();

    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = fileContent;

    if (e.shiftKey) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', end);
      const blockEnd = lineEnd === -1 ? value.length : lineEnd;
      const block = value.slice(lineStart, blockEnd);
      const dedented = block
        .split('\n')
        .map((line) => (line.startsWith(TAB) ? line.slice(1) : line.replace(/^ {1,2}/, '')))
        .join('\n');
      if (dedented === block) return;
      const next = value.slice(0, lineStart) + dedented + value.slice(blockEnd);
      const removed = block.length - dedented.length;
      setFileContent(next);
      updateLineCount(next);
      setSaveState('idle');
      requestAnimationFrame(() => {
        el.selectionStart = Math.max(lineStart, start - Math.min(removed, start - lineStart));
        el.selectionEnd = Math.max(el.selectionStart, end - removed);
        updateCursorFromSelection(el);
        syncScroll();
      });
      return;
    }

    if (start !== end && value.slice(start, end).includes('\n')) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = value.indexOf('\n', end);
      const blockEnd = lineEnd === -1 ? value.length : lineEnd;
      const block = value.slice(lineStart, blockEnd);
      const indented = block
        .split('\n')
        .map((line) => TAB + line)
        .join('\n');
      const next = value.slice(0, lineStart) + indented + value.slice(blockEnd);
      const added = indented.length - block.length;
      setFileContent(next);
      updateLineCount(next);
      setSaveState('idle');
      requestAnimationFrame(() => {
        el.selectionStart = start + 1;
        el.selectionEnd = end + added;
        updateCursorFromSelection(el);
        syncScroll();
      });
      return;
    }

    const next = value.slice(0, start) + TAB + value.slice(end);
    setFileContent(next);
    updateLineCount(next);
    setSaveState('idle');
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 1;
      updateCursorFromSelection(el);
      syncScroll();
    });
  };

  return {
    fileContent,
    savedContent,
    loading,
    fileError,
    saveState,
    lineCount,
    cursorLine,
    cursorCol,
    showLineNumbers,
    setShowLineNumbers,
    wordWrap,
    setWordWrap,
    showFind,
    setShowFind,
    findQuery,
    setFindQuery: setFindQueryAndReset,
    findMatches,
    findIndex,
    findNext,
    findPrev,
    openFind,
    closeFind,
    dirty,
    fileName,
    language,
    fileExtension,
    returnDir,
    highlightedTokens,
    shouldHighlight,
    editorRef,
    lineNumbersRef,
    highlightRef,
    findInputRef,
    syncScroll,
    saveFile,
    revertFile,
    handleTextareaChange,
    handleEditorKeyDown,
    updateCursorFromSelection,
  };
}
