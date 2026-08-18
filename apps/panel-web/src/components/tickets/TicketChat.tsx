import { useEffect, useRef, useState } from 'react';
import { Headphones, ImagePlus, MessageSquare, Send, User, X } from 'lucide-react';
import type { TicketAttachment, TicketMessage } from '../../lib/api';
import { UserAvatar } from '../UserAvatar';
import { displayTicketUser, formatTicketTime } from '../../lib/ticket-utils';

const MAX_IMAGES = 5;
const ACCEPTED_IMAGES = 'image/png,image/jpeg,image/webp,image/gif';

function TicketImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="ticket-page__lightbox" role="dialog" aria-label="Image preview">
      <button type="button" className="ticket-page__lightbox-backdrop" aria-label="Close" onClick={onClose} />
      <div className="ticket-page__lightbox-inner">
        <button type="button" className="ticket-page__lightbox-close" aria-label="Close" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
        <img src={src} alt={alt} className="ticket-page__lightbox-img" />
      </div>
    </div>
  );
}

function MessageAttachments({
  attachments,
  onOpen,
}: {
  attachments: TicketAttachment[];
  onOpen: (attachment: TicketAttachment) => void;
}) {
  if (!attachments.length) return null;

  return (
    <div className={`ticket-page__attachments${attachments.length > 1 ? ' ticket-page__attachments--grid' : ''}`}>
      {attachments.map((attachment) => (
        <button
          key={attachment.id}
          type="button"
          className="ticket-page__attachment"
          onClick={() => onOpen(attachment)}
          aria-label={`View image ${attachment.filename}`}
        >
          <img src={attachment.url} alt={attachment.filename} loading="lazy" />
        </button>
      ))}
    </div>
  );
}

export function TicketChat({
  messages,
  currentUserId,
}: {
  messages: TicketMessage[];
  currentUserId?: string;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [lightbox, setLightbox] = useState<TicketAttachment | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.id]);

  if (!messages.length) {
    return (
      <div className="ticket-page__empty">
        <div className="ticket-page__empty-icon">
          <MessageSquare className="h-6 w-6" />
        </div>
        <p className="ticket-page__empty-title">No messages yet</p>
        <p className="ticket-page__empty-hint">Send a reply below to start the conversation with support.</p>
      </div>
    );
  }

  return (
    <>
      <div ref={listRef} className="ticket-page__msg-list">
        {messages.map((message) => {
          const isStaff = message.isStaff;
          const isYou = Boolean(currentUserId && message.author.id === currentUserId);
          const side = isStaff ? 'staff' : 'customer';
          const hasBody = Boolean(message.body.trim());

          return (
            <article
              key={message.id}
              className={`ticket-page__msg ticket-page__msg--${side}`}
            >
              <div className={`ticket-page__msg-avatar ticket-page__msg-avatar--${side}`}>
                <UserAvatar user={message.author} size="sm" />
              </div>

              <div className="ticket-page__msg-inner">
                <div className="ticket-page__msg-meta">
                  <span className="ticket-page__msg-role" aria-hidden>
                    {isStaff ? <Headphones className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  </span>
                  <span className="ticket-page__msg-name">
                    {isYou ? 'You' : displayTicketUser(message.author)}
                  </span>
                  {isStaff ? <span className="ticket-page__msg-badge">Staff</span> : null}
                  <time dateTime={message.createdAt}>{formatTicketTime(message.createdAt)}</time>
                </div>

                {(hasBody || (message.attachments?.length ?? 0) > 0) && (
                  <div className="ticket-page__bubble">
                    {hasBody ? <p className="ticket-page__bubble-text">{message.body}</p> : null}
                    <MessageAttachments
                      attachments={message.attachments ?? []}
                      onOpen={setLightbox}
                    />
                  </div>
                )}
              </div>
            </article>
          );
        })}
        <div ref={endRef} className="ticket-page__scroll-anchor" aria-hidden />
      </div>

      {lightbox ? (
        <TicketImageLightbox
          src={lightbox.url}
          alt={lightbox.filename}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  );
}

export function TicketReplyBox({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = 'Write a reply…',
  submitLabel = 'Send',
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (payload: { body: string; images: File[] }) => void;
  disabled?: boolean;
  placeholder?: string;
  submitLabel?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [images]);

  const canSend = Boolean(value.trim() || images.length) && !disabled;

  function addImages(files: FileList | File[]) {
    const incoming = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!incoming.length) return;
    setImages((prev) => [...prev, ...incoming].slice(0, MAX_IMAGES));
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!canSend) return;
    onSubmit({ body: value.trim(), images });
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="ticket-page__composer">
      {previews.length > 0 ? (
        <div className="ticket-page__composer-previews">
          {previews.map((preview, index) => (
            <div key={preview} className="ticket-page__composer-preview">
              <img src={preview} alt="" />
              <button
                type="button"
                className="ticket-page__composer-preview-remove"
                aria-label="Remove image"
                disabled={disabled}
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="ticket-page__composer-row">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGES}
          multiple
          className="sr-only"
          disabled={disabled || images.length >= MAX_IMAGES}
          onChange={(e) => {
            if (e.target.files) addImages(e.target.files);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          className="ticket-page__attach"
          aria-label="Attach image"
          title="Attach image (PNG, JPEG, WebP, GIF)"
          disabled={disabled || images.length >= MAX_IMAGES}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
        </button>

        <textarea
          className="ticket-page__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={10000}
          rows={2}
        />

        <button
          type="button"
          className="ticket-page__send"
          disabled={!canSend}
          onClick={handleSubmit}
        >
          <Send className="h-4 w-4" />
          <span>{disabled ? 'Sending…' : submitLabel}</span>
        </button>
      </div>

      <p className="ticket-page__hint">
        Enter to send · Shift+Enter for new line · Images only (max {MAX_IMAGES}, 5 MB each)
      </p>
    </div>
  );
}
