import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AdminEditLoading } from '../../components/admin/AdminEditLayout';
import {
  LocationDetailHeaderShell,
  LocationDetailTabNav,
  type LocationDetailTab,
} from '../../components/admin/location-detail/LocationDetailShell';
import { LocationNodesDashboard } from '../../components/admin/location-detail/LocationNodesDashboard';
import { LocationSettingsDashboard } from '../../components/admin/location-detail/LocationSettingsDashboard';
import { AdminDetailNotFound } from '../../components/AdminDetailLayout';
import { AdminLayout } from '../../components/Layout';
import { api, type AdminLocationDetail, type UpdateAdminLocationInput } from '../../lib/api';

function readLocationTab(value: string | null): LocationDetailTab {
  return value === 'nodes' ? 'nodes' : 'settings';
}

export function AdminLocationDetail() {
  const { locationId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [detail, setDetail] = useState<AdminLocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<UpdateAdminLocationInput>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState<'id' | 'uuid' | null>(null);

  const tab = readLocationTab(searchParams.get('tab'));

  async function load() {
    setLoading(true);
    setError('');
    try {
      const loc = await api.admin.location(locationId);
      setDetail(loc);
      setForm({ short: loc.short, long: loc.long, flagUrl: loc.flagUrl ?? '' });
    } catch {
      setDetail(null);
      setError('Failed to load location');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [locationId]);

  const hasChanges = useMemo(() => {
    if (!detail) return false;
    return (
      form.short !== detail.short ||
      form.long !== detail.long ||
      (form.flagUrl ?? '').trim() !== (detail.flagUrl ?? '').trim()
    );
  }, [detail, form]);

  function resetForm() {
    if (!detail) return;
    setForm({ short: detail.short, long: detail.long, flagUrl: detail.flagUrl ?? '' });
    setError('');
    setSaved(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.admin.updateLocation(locationId, {
        short: form.short,
        long: form.long,
        flagUrl: form.flagUrl?.trim() ? form.flagUrl.trim() : null,
      });
      await load();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location');
    } finally {
      setSaving(false);
    }
  }

  async function deleteLocation() {
    setSaving(true);
    setError('');
    try {
      await api.admin.deleteLocation(locationId);
      navigate('/admin/locations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete location');
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text: string, key: 'id' | 'uuid') {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  function changeTab(next: LocationDetailTab) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'settings') params.delete('tab');
        else params.set('tab', next);
        return params;
      },
      { replace: true },
    );
  }

  const tabs = useMemo(
    () => [
      { id: 'settings' as const, label: 'Settings' },
      { id: 'nodes' as const, label: 'Nodes', count: detail?.nodeCount },
    ],
    [detail?.nodeCount],
  );

  if (loading) {
    return (
      <AdminLayout>
        <AdminEditLoading />
      </AdminLayout>
    );
  }

  if (!detail) {
    return (
      <AdminLayout>
        <AdminDetailNotFound
          message={error || 'Location not found'}
          backTo="/admin/locations"
          backLabel="Back to locations"
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <form onSubmit={(e) => void save(e)} className="ds-loc-page">
        <LocationDetailHeaderShell
          detail={detail}
          onViewNodes={() => changeTab('nodes')}
          onCopyUuid={() => void copyText(detail.uuid, 'uuid')}
          copied={copied === 'uuid'}
          tabNav={<LocationDetailTabNav tabs={tabs} active={tab} onChange={changeTab} />}
        />

        {tab === 'settings' ? (
          <LocationSettingsDashboard
            ctrl={{
              detail,
              form,
              setForm,
              saving,
              error,
              saved,
              hasChanges,
              confirmDelete,
              setConfirmDelete,
              copied,
              resetForm,
              deleteLocation,
              copyText,
            }}
          />
        ) : (
          <LocationNodesDashboard detail={detail} />
        )}
      </form>
    </AdminLayout>
  );
}
