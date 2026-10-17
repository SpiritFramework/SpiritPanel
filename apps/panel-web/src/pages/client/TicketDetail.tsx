import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, XCircle } from 'lucide-react';
import { api, type TicketDetail } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { Button, ClientLayout, Page } from '../../components/Layout';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertBanner, PageHeader, Spinner } from '../../components/ui';
import {
  TicketDetailShell,
  TicketDetailsCard,
} from '../../components/tickets/TicketDetailShell';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { branding } = useBranding();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const loadInFlightRef = useRef(false);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!id || loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const soft = loadedRef.current;
    if (!soft) setLoading(true);
    setError('');
    try {
      setTicket(await api.client.ticket(id));
      loadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
      if (!soft) setTicket(null);
    } finally {
      setLoading(false);
      loadInFlightRef.current = false;
    }
  }, [id]);

  useEffect(() => {
    loadedRef.current = false;
    setTicket(null);
    setReply('');
    if (branding.ticketsEnabled === false) {
      setLoading(false);
      return;
    }
    void load();
  }, [branding.ticketsEnabled, id, load]);

  useEffect(() => {
    if (branding.ticketsEnabled === false || !id) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void load();
    };
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [branding.ticketsEnabled, id, load]);

  async function sendReply(payload: { body: string; images: File[] }) {
    if (!id || (!payload.body && !payload.images.length)) return;
    setSending(true);
    setError('');
    try {
      setTicket(await api.client.replyTicket(id, payload));
      setReply('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  async function closeTicket() {
    if (!id) return;
    setClosing(true);
    setError('');
    try {
      setTicket(await api.client.closeTicket(id));
      setConfirmClose(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close ticket');
    } finally {
      setClosing(false);
    }
  }

  if (branding.ticketsEnabled === false) {
    return (
      <ClientLayout>
        <Page>
          <PageHeader title="Support ticket" />
          <AlertBanner tone="warning">Support tickets are currently disabled.</AlertBanner>
        </Page>
      </ClientLayout>
    );
  }

  if (loading && !ticket) {
    return (
      <ClientLayout fillHeight>
        <div className="ticket-page ticket-page--client" role="status" aria-live="polite">
          <div className="ticket-page__loading">
            <Spinner className="h-7 w-7" />
            <span>Opening conversation…</span>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (!ticket) {
    return (
      <ClientLayout>
        <Page>
          <PageHeader title="Support ticket" />
          <AlertBanner tone="error">{error || 'Ticket not found'}</AlertBanner>
          <Link to="/tickets" className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--accent)]">
            <ArrowLeft className="h-4 w-4" />
            Back to tickets
          </Link>
        </Page>
      </ClientLayout>
    );
  }

  const closed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <ClientLayout fillHeight>
      <TicketDetailShell
        ticket={ticket}
        backHref="/tickets"
        backLabel="All tickets"
        error={error || undefined}
        currentUserId={user?.id}
        reply={reply}
        onReplyChange={setReply}
        onSendReply={(payload) => void sendReply(payload)}
        sending={sending}
        closed={closed}
        replyPlaceholder="Write a reply for support…"
        closedMessage={
          <>
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              This ticket is {ticket.status === 'resolved' ? 'resolved' : 'closed'}. You can read the history but
              cannot send new messages.
            </span>
          </>
        }
        sidebar={
          <>
            <TicketDetailsCard
              ticket={ticket}
              serverHref={ticket.server ? `/servers/${ticket.server.id}` : undefined}
            />

            {!closed ? (
              <div className="ticket-page__sidebar-actions">
                <p className="ticket-page__sidebar-hint">
                  Done with this issue? Closing stops further replies but keeps the thread for your records.
                </p>
                <Button variant="secondary" className="w-full" onClick={() => setConfirmClose(true)} disabled={closing}>
                  <XCircle className="h-4 w-4" />
                  {closing ? 'Closing…' : 'Close ticket'}
                </Button>
              </div>
            ) : null}
          </>
        }
      />

      <ConfirmModal
        open={confirmClose}
        title="Close this ticket?"
        description="You can still read the history but cannot send new messages."
        confirmLabel="Close ticket"
        tone="warning"
        loading={closing}
        onClose={() => {
          if (!closing) setConfirmClose(false);
        }}
        onConfirm={() => void closeTicket()}
      />
    </ClientLayout>
  );
}
