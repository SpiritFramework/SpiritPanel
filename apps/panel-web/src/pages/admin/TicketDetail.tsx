import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { api, type TicketDetail, type TicketPriority, type TicketStatus } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout, Button, Page, Select } from '../../components/Layout';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertBanner, PageHeader, PageLoading } from '../../components/ui';
import {
  TicketDetailShell,
  TicketDetailsCard,
  TicketMetaCard,
} from '../../components/tickets/TicketDetailShell';

const STATUS_OPTIONS: Array<{ value: TicketStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'awaiting_reply', label: 'Awaiting reply' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const PRIORITY_OPTIONS: Array<{ value: TicketPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      setTicket(await api.admin.ticket(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchTicket(data: { status?: TicketStatus; priority?: TicketPriority }) {
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      setTicket(await api.admin.updateTicket(id, data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket');
    } finally {
      setSaving(false);
    }
  }

  async function sendReply(payload: { body: string; images: File[] }) {
    if (!id || (!payload.body && !payload.images.length)) return;
    setSending(true);
    setError('');
    try {
      setTicket(await api.admin.replyTicket(id, payload));
      setReply('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  async function deleteTicket() {
    if (!id) return;
    setDeleting(true);
    setDeleteError('');
    setError('');
    try {
      await api.admin.deleteTicket(id);
      navigate('/admin/tickets');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete ticket';
      setDeleteError(message);
      setError(message);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <PageLoading label="Loading ticket…" />
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout>
        <Page>
          <PageHeader title="Support ticket" />
          <AlertBanner tone="error">{error || 'Ticket not found'}</AlertBanner>
          <Link to="/admin/tickets" className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--accent)]">
            <ArrowLeft className="h-4 w-4" />
            Back to tickets
          </Link>
        </Page>
      </AdminLayout>
    );
  }

  const closed = ticket.status === 'closed';

  return (
    <AdminLayout fillHeight>
      <TicketDetailShell
        ticket={ticket}
        backHref="/admin/tickets"
        backLabel="All tickets"
        error={error || undefined}
        currentUserId={user?.id}
        reply={reply}
        onReplyChange={setReply}
        onSendReply={(payload) => void sendReply(payload)}
        sending={sending}
        closed={closed}
        replyPlaceholder="Reply as staff…"
        closedMessage={<span>This ticket is closed. Reopen it from the controls to send another reply.</span>}
        headerActions={
          <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        }
        sidebar={
          <>
            <TicketMetaCard title="Controls">
              <div className="ticket-page__fields">
                <Select
                  label="Status"
                  value={ticket.status}
                  disabled={saving}
                  onChange={(e) => void patchTicket({ status: e.target.value as TicketStatus })}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Priority"
                  value={ticket.priority}
                  disabled={saving}
                  onChange={(e) => void patchTicket({ priority: e.target.value as TicketPriority })}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>
            </TicketMetaCard>

            <TicketDetailsCard
              ticket={ticket}
              showUser
              userHref={`/admin/users/${ticket.user.id}`}
              serverHref={ticket.server ? `/admin/servers/${ticket.server.id}` : undefined}
            />
          </>
        }
      />
      <ConfirmModal
        open={showDeleteConfirm}
        title="Permanently delete this ticket?"
        detail={ticket ? `#${ticket.number} · ${ticket.subject}` : undefined}
        description="This removes the ticket, all messages, and any uploaded images. This cannot be undone."
        confirmLabel="Delete ticket"
        tone="danger"
        loading={deleting}
        error={deleteError}
        onClose={() => {
          if (!deleting) {
            setShowDeleteConfirm(false);
            setDeleteError('');
          }
        }}
        onConfirm={() => void deleteTicket()}
      />
    </AdminLayout>
  );
}
