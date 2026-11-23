/**
 * Match schedule generator (issue #77) — enter the tournament
 * conditions, generate a day-by-day fixture list, preview it and save
 * it for the event. The generator is deterministic (backend
 * app.schedule): no LLM. The KGRA setup is the default form — Pro and
 * Legend groups, 4 placeholder teams each, 4 matches a day, 12 overs
 * — edit the team names and conditions to fit any tournament.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import AppShell from '@/components/AppShell';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CalendarDays,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Default form = the KGRA tournament (issue #77). Team names are
// placeholders for the organiser to replace.
const DEFAULT_GROUPS = [
  { name: 'Pro', teamsText: 'Pro Team 1\nPro Team 2\nPro Team 3\nPro Team 4' },
  { name: 'Legend', teamsText: 'Legend Team 1\nLegend Team 2\nLegend Team 3\nLegend Team 4' },
];

const parseTeams = (text) =>
  text
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

export default function EventSchedule() {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [eventName, setEventName] = useState('');
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [finalsPerGroup, setFinalsPerGroup] = useState(true);
  const [matchesPerDay, setMatchesPerDay] = useState(4);
  const [overs, setOvers] = useState(12);
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState(4);
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(null);
  const [description, setDescription] = useState('');
  const [interpreting, setInterpreting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventId || !token) return;
    let cancelled = false;
    const load = async () => {
      try {
        const eventRes = await axios.get(`${API}/auctions/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        setEventName(eventRes.data?.name || '');
      } catch (err) {
        if (!cancelled) {
          toast.error(err.response?.data?.detail || 'Failed to load event');
        }
      }
      try {
        const { data } = await axios.get(`${API}/events/${eventId}/schedule`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        setSaved(data);
        setPreview(data.schedule);
        fillFromConditions(data.conditions);
      } catch (err) {
        if (!cancelled && err.response?.status !== 404) {
          toast.error(err.response?.data?.detail || 'Failed to load schedule');
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

  const fillFromConditions = (conditions) => {
    if (!conditions) return;
    setGroups(
      (conditions.groups || []).map((g) => ({
        name: g.name,
        teamsText: (g.teams || []).join('\n'),
      }))
    );
    setFinalsPerGroup(conditions.finals_per_group !== false);
    setMatchesPerDay(conditions.matches_per_day || 4);
    setOvers(conditions.overs || 12);
    setStartDate(conditions.start_date || '');
    setDays(conditions.days || '');
  };

  const buildConditions = () => ({
    groups: groups.map((g) => ({ name: g.name.trim(), teams: parseTeams(g.teamsText) })),
    finals_per_group: finalsPerGroup,
    matches_per_day: Number(matchesPerDay),
    overs: Number(overs),
    start_date: startDate || null,
    days: days === '' || days === null ? null : Number(days),
  });

  const handleInterpret = async () => {
    if (!description.trim()) {
      toast.error('Describe the tournament first');
      return;
    }
    setInterpreting(true);
    try {
      const { data } = await axios.post(
        `${API}/events/${eventId}/schedule/interpret`,
        { text: description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fillFromConditions(data.conditions);
      toast.success('Conditions filled in — review them, correct anything, then Generate schedule');
    } catch (err) {
      // The backend says plainly when AI is not configured (503) or the
      // description could not be understood (400); the manual form
      // below stays usable either way.
      toast.error(err.response?.data?.detail || 'Could not interpret that description');
    } finally {
      setInterpreting(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await axios.post(
        `${API}/events/${eventId}/schedule/generate`,
        buildConditions(),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPreview(data);
      toast.success(`Schedule generated — ${data.total_matches} matches over ${data.days.length} days`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not generate a schedule for these conditions');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const { data } = await axios.post(
        `${API}/events/${eventId}/schedule`,
        { conditions: buildConditions(), schedule: preview },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSaved(data);
      toast.success('Schedule saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete the saved schedule for this event?')) return;
    try {
      await axios.delete(`${API}/events/${eventId}/schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSaved(null);
      setPreview(null);
      toast.success('Schedule deleted');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete schedule');
    }
  };

  const updateGroup = (index, field, value) => {
    setGroups((prev) => prev.map((g, i) => (i === index ? { ...g, [field]: value } : g)));
  };

  const addGroup = () => setGroups((prev) => [...prev, { name: '', teamsText: '' }]);

  const removeGroup = (index) =>
    setGroups((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const formatDayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AppShell title="Match Schedule" subtitle={eventName}>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Match Schedule"
          description={eventName ? `Fixtures for ${eventName}` : 'Generate the day-by-day fixture list'}
          actions={
            <Link to={`/admin/events/${eventId}/settings`}>
              <Button variant="outline" className="border-white/15 bg-white/5 text-white/85 hover:bg-white/10">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to settings
              </Button>
            </Link>
          }
        />

        {loading ? (
          <p className="text-white/60">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Conditions form */}
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-white">Tournament conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Describe in words — AI fills in the conditions below */}
                <div className="space-y-2 rounded-lg border border-white/10 p-3">
                  <Label className="text-white/70">Describe in words</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={'e.g. Two groups, Pro and Legend, 4 teams in each. Round robin in each group, a separate final for each group, 12 overs per match, 4 days, max 4 matches a day. All Pro matches first because we provide their accommodation, so the Pro teams finish and leave and only the Legend teams stay.'}
                    rows={4}
                    className="border-white/15 bg-white/5 text-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/15 bg-white/5 text-white/85 hover:bg-white/10"
                    onClick={handleInterpret}
                    disabled={interpreting}
                  >
                    <Sparkles className="mr-1 h-4 w-4" />
                    {interpreting ? 'Interpreting…' : 'Interpret'}
                  </Button>
                  <p className="text-xs text-white/50">
                    The AI fills in the conditions below — review them and correct
                    anything before generating. If AI is not set up, just fill in
                    the conditions manually.
                  </p>
                </div>

                {groups.map((group, index) => (
                  <div key={index} className="space-y-2 rounded-lg border border-white/10 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label className="text-white/70">Group {index + 1} name</Label>
                        <Input
                          value={group.name}
                          onChange={(e) => updateGroup(index, 'name', e.target.value)}
                          placeholder="e.g. Pro"
                          className="border-white/15 bg-white/5 text-white"
                        />
                      </div>
                      {groups.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-5 text-red-300 hover:text-red-200"
                          onClick={() => removeGroup(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label className="text-white/70">Teams — one per line</Label>
                      <Textarea
                        value={group.teamsText}
                        onChange={(e) => updateGroup(index, 'teamsText', e.target.value)}
                        placeholder={'Team 1\nTeam 2\nTeam 3\nTeam 4'}
                        rows={4}
                        className="border-white/15 bg-white/5 text-white"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/15 bg-white/5 text-white/85 hover:bg-white/10"
                  onClick={addGroup}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add group
                </Button>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/70">Matches per day (max)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={matchesPerDay}
                      onChange={(e) => setMatchesPerDay(e.target.value)}
                      className="border-white/15 bg-white/5 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/70">Overs per match</Label>
                    <Input
                      type="number"
                      min="1"
                      value={overs}
                      onChange={(e) => setOvers(e.target.value)}
                      className="border-white/15 bg-white/5 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/70">Start date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border-white/15 bg-white/5 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/70">Days available (optional)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      placeholder="Leave blank to pack into the fewest days"
                      className="border-white/15 bg-white/5 text-white"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm text-white/85">
                  <input
                    type="checkbox"
                    checked={finalsPerGroup}
                    onChange={(e) => setFinalsPerGroup(e.target.checked)}
                    className="h-4 w-4 accent-red-600"
                  />
                  Separate final for each group
                </label>

                <p className="text-xs text-white/50">
                  Groups play in the order listed — all of one group&apos;s matches
                  (including its final) finish before the next group starts.
                </p>

                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {generating ? 'Generating…' : 'Generate schedule'}
                </Button>
              </CardContent>
            </Card>

            {/* Preview / saved schedule */}
            <Card className="border-white/10 bg-white/5">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">
                  {saved ? 'Saved schedule' : preview ? 'Preview' : 'Schedule'}
                </CardTitle>
                <div className="flex gap-2">
                  {preview && (
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : saved ? 'Save changes' : 'Save schedule'}
                    </Button>
                  )}
                  {saved && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                      onClick={handleDelete}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!preview ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center text-white/50">
                    <CalendarDays className="h-8 w-8" />
                    <p className="text-sm">
                      No schedule yet. Enter the conditions and click Generate schedule.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-white/70">
                      {preview.total_matches} matches over {preview.days.length} day
                      {preview.days.length === 1 ? '' : 's'}
                    </p>
                    {preview.days.map((day) => (
                      <div key={day.day} className="rounded-lg border border-white/10 p-3">
                        <p className="mb-2 text-sm font-semibold text-white">
                          Day {day.day}
                          {day.date ? ` — ${formatDayDate(day.date)}` : ''}
                        </p>
                        <ul className="space-y-1.5">
                          {day.matches.map((m) => (
                            <li key={m.match} className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="w-6 text-white/40">M{m.match}</span>
                              <Badge
                                variant="outline"
                                className={
                                  m.stage === 'final'
                                    ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                                    : 'border-white/15 bg-white/5 text-white/70'
                                }
                              >
                                {m.stage === 'final' ? 'Final' : m.group}
                              </Badge>
                              <span className="text-white/90">
                                {m.team_a} <span className="text-white/40">vs</span> {m.team_b}
                              </span>
                              <span className="ml-auto text-xs text-white/40">
                                {m.stage === 'final' ? `${m.group} · ` : ''}{m.overs} overs
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
