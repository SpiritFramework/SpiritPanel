import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, Trash2, UserCheck, UserMinus } from 'lucide-react';
import { api, type TicketDetail, type TicketPriority, type TicketStatus } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout, Button, Page } from '../../components/Layout';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertBanner, PageHeader, PageLoading } from '../../components/ui';
import {
  TicketDetailShell,
  TicketDetailsCard,
  TicketMetaCard,
} from '../../components/tickets/TicketDetailShell';
import { displayTicketUser } from '../../lib/ticket-utils';

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

  async function patchTicket(data: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: string | null }) {
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
  const assignedToMe = Boolean(user?.id && ticket.assignee?.id === user.id);

  return (
    <AdminLayout fillHeight>
      <TicketDetailShell
        ticket={ticket}
        backHref="/admin/tickets"
        backLabel="All tickets"
        variant="admin"
        error={error || undefined}
        currentUserId={user?.id}
        reply={reply}
        onReplyChange={setReply}
        onSendReply={(payload) => void sendReply(payload)}
        sending={sending}
        closed={closed}
        replyPlaceholder="Reply as staff…"
        closedMessage={
          <>
            <Lock className="h-4 w-4 shrink-0" />
            <span>This ticket is closed. Reopen it from Controls to send another reply.</span>
          </>
        }
        headerActions={
          <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        }
        sidebar={
          <>
            <TicketDetailsCard
              ticket={ticket}
              showUser
              userHref={`/admin/users/${ticket.user.id}`}
              serverHref={ticket.server ? `/admin/servers/${ticket.server.id}` : undefined}
            />

            <TicketMetaCard title="Controls">
              <div className="ticket-page__control-block">
                <p className="ticket-page__control-label">Status</p>
                <div className="ticket-page__chip-grid" role="group" aria-label="Ticket status">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`ticket-page__chip${ticket.status === s.value ? ' is-active' : ''}`}
                      disabled={saving}
                      onClick={() => void patchTicket({ status: s.value })}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ticket-page__control-block" style={{ marginTop: '0.9rem' }}>
                <p className="ticket-page__control-label">Priority</p>
                <div className="ticket-page__chip-grid" role="group" aria-label="Ticket priority">
                  {PRIORITY_OPTIONS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      className={`ticket-page__chip${p.value === 'urgent' ? ' ticket-page__chip--danger' : ''}${p.value === 'high' ? ' ticket-page__chip--warning' : ''}${ticket.priority === p.value ? ' is-active' : ''}`}
                      disabled={saving}
                      onClick={() => void patchTicket({ priority: p.value })}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ticket-page__assign">
                <p className="ticket-page__assign-label">Assignee</p>
                <div className="ticket-page__assign-row">
                  <p className="ticket-page__assign-value">
                    {ticket.assignee ? displayTicketUser(ticket.assignee) : 'Unassigned'}
                  </p>
                  <div className="ticket-page__assign-actions">
                    {user?.id && !assignedToMe ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={saving}
                        onClick={() => void patchTicket({ assigneeId: user.id })}
                      >
                        <UserCheck className="h-4 w-4" />
                        Assign to me
                      </Button>
                    ) : null}
                    {ticket.assignee ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saving}
                        onClick={() => void patchTicket({ assigneeId: null })}
                      >
                        <UserMinus className="h-4 w-4" />
                        Unassign
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </TicketMetaCard>
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
