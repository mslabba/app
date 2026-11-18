/**
 * Manage an event organizer's member list — view, edit and delete.
 * Reached from the "Manage" link next to the member count in Auction
 * settings. The list is the organizer's, shared across all their
 * events, so changes here affect every event of that organizer.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Check,
  Pencil,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EventMembers() {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [eventName, setEventName] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editingPhone, setEditingPhone] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventId || !token) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [eventRes, membersRes] = await Promise.all([
          axios.get(`${API}/auctions/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API}/auctions/${eventId}/members/list`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (cancelled) return;
        setEventName(eventRes.data?.name || '');
        setMembers(membersRes.data?.members || []);
      } catch (err) {
        if (!cancelled) {
          toast.error(err.response?.data?.detail || 'Failed to load members');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.phone_normalized || '').includes(q)
    );
  }, [members, query]);

  const startEdit = (member) => {
    setEditingPhone(member.phone_normalized);
    setEditName(member.name || '');
    setEditPhone(member.phone_normalized);
  };

  const cancelEdit = () => {
    setEditingPhone(null);
    setEditName('');
    setEditPhone('');
  };

  const saveEdit = async (member) => {
    if (!editName.trim() || !editPhone.trim()) {
      toast.error('Enter the member name and mobile number');
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.patch(
        `${API}/auctions/${eventId}/members/${member.phone_normalized}`,
        { name: editName.trim(), phone: editPhone.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMembers((prev) =>
        prev.map((m) =>
          m.phone_normalized === member.phone_normalized ? data : m
        )
      );
      cancelEdit();
      toast.success('Member updated');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async (member) => {
    if (
      !window.confirm(
        `Remove ${member.name || member.phone_normalized} from your member list?`
      )
    ) {
      return;
    }
    try {
      await axios.delete(
        `${API}/auctions/${eventId}/members/${member.phone_normalized}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMembers((prev) =>
        prev.filter((m) => m.phone_normalized !== member.phone_normalized)
      );
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <PageHeader
          title="Manage members"
          description={
            eventName
              ? `${eventName} · ${members.length} member${members.length === 1 ? '' : 's'}`
              : `${members.length} member${members.length === 1 ? '' : 's'}`
          }
          actions={
            <Link to={`/admin/events/${eventId}/settings`}>
              <Button
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to settings
              </Button>
            </Link>
          }
        />

        <Card className="glass mt-6 border-white/15">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-red-300" />
              Member list
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or mobile number"
                className="border-white/20 bg-white/5 pl-9 text-white placeholder:text-white/35"
              />
            </div>

            {loading ? (
              <p className="py-6 text-center text-sm text-white/60">
                Loading members…
              </p>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/60">
                {members.length === 0
                  ? 'No members yet. Add one from the Member list section in Auction settings, or upload an Excel sheet.'
                  : 'No members match that search.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-white/60">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Mobile number</th>
                      <th className="px-4 py-3 font-medium">Added</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((member) => {
                      const isEditing =
                        editingPhone === member.phone_normalized;
                      return (
                        <tr
                          key={member.phone_normalized}
                          className="border-b border-white/5 last:border-0 hover:bg-white/5"
                        >
                          {isEditing ? (
                            <>
                              <td className="px-4 py-3">
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  disabled={saving}
                                  className="border-white/20 bg-white/5 text-white placeholder:text-white/35"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  inputMode="tel"
                                  disabled={saving}
                                  className="border-white/20 bg-white/5 text-white placeholder:text-white/35"
                                />
                              </td>
                              <td className="px-4 py-3 text-white/60">
                                {member.created_at
                                  ? new Date(
                                      member.created_at
                                    ).toLocaleDateString()
                                  : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={saving}
                                    onClick={() => saveEdit(member)}
                                    className="bg-red-600 text-white hover:bg-red-500"
                                  >
                                    <Check className="h-4 w-4" />
                                    <span className="sr-only">Save</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={saving}
                                    onClick={cancelEdit}
                                    className="text-white/60 hover:text-white"
                                  >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Cancel</span>
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 font-medium text-white">
                                {member.name || '—'}
                              </td>
                              <td className="px-4 py-3 text-white/80">
                                {member.phone_normalized}
                              </td>
                              <td className="px-4 py-3 text-white/60">
                                {member.created_at
                                  ? new Date(
                                      member.created_at
                                    ).toLocaleDateString()
                                  : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEdit(member)}
                                    className="text-white/60 hover:text-white"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteMember(member)}
                                    className="text-white/50 hover:text-red-300"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
