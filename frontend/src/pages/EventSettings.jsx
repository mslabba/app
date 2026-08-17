/**
 * Per-auction settings — rules, registration limits, payment, registration form.
 * Account-level bank details stay on /admin/settings.
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Users,
  DollarSign,
  Gavel,
  Share2,
  Landmark,
  ArrowLeft,
  FormInput,
  Plus,
  Trash2,
  GripVertical,
  MonitorPlay,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import {
  FIELD_TYPES,
  defaultRegistrationFormConfig,
  newCustomField,
  resolveRegistrationFormConfig,
} from '@/lib/registrationFormConfig';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const emptyForm = () => ({
  name: '',
  date: '',
  description: '',
  logo_url: '',
  banner_url: '',
  rules: {
    min_squad_size: 11,
    max_squad_size: 18,
    min_bid_increment: 50000,
    timer_duration: 60,
    rtm_cards_per_team: 2,
  },
  payment_settings: {
    collect_payment: false,
    registration_fee: null,
  },
  has_registration_limit: false,
  registration_limit: null,
  registration_form_config: defaultRegistrationFormConfig(),
});

const EventSettings = () => {
  const { eventId } = useParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [customDraft, setCustomDraft] = useState(() => newCustomField());
  const [broadcastLinks, setBroadcastLinks] = useState(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  useEffect(() => {
    if (!eventId || !token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API}/auctions/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        setFormData({
          name: data.name || '',
          date: data.date || '',
          description: data.description || '',
          logo_url: data.logo_url || '',
          banner_url: data.banner_url || '',
          rules: {
            min_squad_size: data.rules?.min_squad_size ?? 11,
            max_squad_size: data.rules?.max_squad_size ?? 18,
            min_bid_increment: data.rules?.min_bid_increment ?? 50000,
            timer_duration: data.rules?.timer_duration ?? 60,
            rtm_cards_per_team: data.rules?.rtm_cards_per_team ?? 2,
          },
          payment_settings: {
            collect_payment: !!data.payment_settings?.collect_payment,
            registration_fee: data.payment_settings?.registration_fee ?? null,
          },
          has_registration_limit: !!data.has_registration_limit,
          registration_limit: data.registration_limit ?? null,
          registration_form_config: resolveRegistrationFormConfig(data),
        });
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to load auction settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, token]);

  const fields = formData.registration_form_config?.fields || [];

  const updateField = (id, patch) => {
    setFormData((prev) => ({
      ...prev,
      registration_form_config: {
        fields: (prev.registration_form_config?.fields || []).map((f) => {
          if (f.id !== id && f.key !== id) return f;
          if (f.locked) {
            return {
              ...f,
              ...patch,
              enabled: true,
              required: true,
              locked: true,
            };
          }
          return { ...f, ...patch };
        }),
      },
    }));
  };

  const removeCustomField = (id) => {
    setFormData((prev) => ({
      ...prev,
      registration_form_config: {
        fields: (prev.registration_form_config?.fields || []).filter(
          (f) => f.id !== id && f.key !== id
        ),
      },
    }));
  };

  const addCustomField = () => {
    if (!customDraft.label.trim()) {
      toast.error('Enter a label for the custom field');
      return;
    }
    if (customDraft.type === 'select' && !(customDraft.options || []).filter(Boolean).length) {
      toast.error('Add at least one dropdown option');
      return;
    }
    const field = {
      ...customDraft,
      label: customDraft.label.trim(),
      options: (customDraft.options || []).map((o) => String(o).trim()).filter(Boolean),
      enabled: true,
    };
    setFormData((prev) => ({
      ...prev,
      registration_form_config: {
        fields: [...(prev.registration_form_config?.fields || []), field],
      },
    }));
    setCustomDraft(newCustomField());
    toast.success(`Added “${field.label}”`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.date) {
      toast.error('Name and date are required');
      return;
    }
    if (
      formData.has_registration_limit &&
      (!formData.registration_limit || formData.registration_limit < 1)
    ) {
      toast.error('Enter a valid maximum number of registrations');
      return;
    }
    if (
      formData.payment_settings.collect_payment &&
      (!formData.payment_settings.registration_fee ||
        formData.payment_settings.registration_fee < 1)
    ) {
      toast.error('Enter a valid registration fee amount');
      return;
    }

    const formConfig = {
      fields: (formData.registration_form_config?.fields || []).map((f) => ({
        id: f.id,
        key: f.key,
        label: f.label,
        type: f.type,
        enabled: !!f.enabled,
        required: !!f.required,
        builtin: !!f.builtin,
        locked: !!f.locked,
        placeholder: f.placeholder || null,
        options: f.options || [],
      })),
    };

    setSaving(true);
    try {
      await axios.put(
        `${API}/auctions/${eventId}`,
        {
          name: formData.name.trim(),
          date: formData.date,
          description: formData.description || null,
          logo_url: formData.logo_url || null,
          banner_url: formData.banner_url || null,
          rules: {
            min_squad_size: parseInt(formData.rules.min_squad_size, 10) || 11,
            max_squad_size: parseInt(formData.rules.max_squad_size, 10) || 18,
            min_bid_increment: parseInt(formData.rules.min_bid_increment, 10) || 50000,
            timer_duration: parseInt(formData.rules.timer_duration, 10) || 60,
            rtm_cards_per_team: parseInt(formData.rules.rtm_cards_per_team, 10) || 2,
          },
          payment_settings: {
            collect_payment: !!formData.payment_settings.collect_payment,
            registration_fee: formData.payment_settings.collect_payment
              ? parseInt(formData.payment_settings.registration_fee, 10)
              : null,
          },
          has_registration_limit: !!formData.has_registration_limit,
          registration_limit: formData.has_registration_limit
            ? parseInt(formData.registration_limit, 10)
            : null,
          registration_form_config: formConfig,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Auction settings saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyRegistrationLink = () => {
    const url = `${window.location.origin}/auctions/${eventId}/register`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Registration link copied'),
      () => toast.error('Could not copy link')
    );
  };

  const generateBroadcastLinks = async () => {
    setBroadcastLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/events/${eventId}/generate-broadcast-link`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Prefer current origin for local OBS
      const origin = window.location.origin;
      const links = {
        token: data.token,
        expires_at: data.expires_at,
        player_url: `${origin}/live/${data.token}/player`,
        teams_url: `${origin}/live/${data.token}/teams`,
      };
      setBroadcastLinks(links);
      toast.success('Broadcast links ready');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate broadcast links');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const copyText = (label, text) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error('Could not copy')
    );
  };

  if (loading) {
    return (
      <AppShell title="Auction settings">
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      </AppShell>
    );
  }

  const builtinFields = fields.filter((f) => f.builtin);
  const customFields = fields.filter((f) => !f.builtin);

  return (
    <AppShell title="Auction settings" subtitle={formData.name}>
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <PageHeader
          title="Auction settings"
          description="Rules, registration form fields, limits, and payment for this auction"
          actions={
            <div className="flex flex-wrap gap-2">
              <Link to="/admin/events">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-1.5 h-4 w-4" />
                  All auctions
                </Button>
              </Link>
              <Link to="/admin/settings">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <Landmark className="mr-1.5 h-4 w-4" />
                  Bank settings
                </Button>
              </Link>
            </div>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basics */}
          <Card className="glass border-white/15">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Settings className="h-5 w-5 text-red-300" />
                Auction details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/80">Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="border-white/20 bg-white/5 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="border-white/20 bg-white/5 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Description</Label>
                <Textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="border-white/20 bg-white/5 text-white"
                />
              </div>

              <div className="border-t border-white/10 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-white/90">Auction images</h3>
                <p className="mb-3 text-xs text-white/50">
                  Logo appears on live control, public registration, and broadcast boards. Banner is optional.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <ImageUpload
                      label="Auction logo"
                      variant="dark"
                      value={formData.logo_url}
                      onChange={(url) => setFormData({ ...formData, logo_url: url })}
                      placeholder="Upload logo or enter URL"
                      sampleType={{ type: 'events', subtype: 'logos' }}
                    />
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <ImageUpload
                      label="Auction banner"
                      variant="dark"
                      value={formData.banner_url}
                      onChange={(url) => setFormData({ ...formData, banner_url: url })}
                      placeholder="Upload banner or enter URL"
                      sampleType={{ type: 'events', subtype: 'banners' }}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                onClick={copyRegistrationLink}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Copy public registration link
              </Button>
            </CardContent>
          </Card>

          {/* OBS / vMix broadcast links */}
          <Card className="glass border-white/15" data-testid="broadcast-links">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MonitorPlay className="h-5 w-5 text-red-300" />
                Live broadcast screens
              </CardTitle>
              <p className="text-sm text-white/55">
                Public read-only URLs for OBS / vMix. No login. Open in a browser source at 1920×1080.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={broadcastLoading}
                onClick={generateBroadcastLinks}
              >
                {broadcastLoading ? 'Generating…' : 'Generate broadcast links'}
              </Button>
              {broadcastLinks && (
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0 truncate text-white/80">
                      Player:{' '}
                      <a
                        href={broadcastLinks.player_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-300 hover:underline"
                      >
                        {broadcastLinks.player_url}
                      </a>
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-white/70"
                        onClick={() => copyText('Player URL', broadcastLinks.player_url)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <a href={broadcastLinks.player_url} target="_blank" rel="noreferrer">
                        <Button type="button" size="sm" variant="ghost" className="text-white/70">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="min-w-0 truncate text-white/80">
                      Teams:{' '}
                      <a
                        href={broadcastLinks.teams_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-300 hover:underline"
                      >
                        {broadcastLinks.teams_url}
                      </a>
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-white/70"
                        onClick={() => copyText('Teams URL', broadcastLinks.teams_url)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <a href={broadcastLinks.teams_url} target="_blank" rel="noreferrer">
                        <Button type="button" size="sm" variant="ghost" className="text-white/70">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </div>
                  </div>
                  {broadcastLinks.expires_at && (
                    <p className="text-xs text-white/40">
                      Expires {new Date(broadcastLinks.expires_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Registration form builder */}
          <Card className="glass border-white/15" data-testid="registration-form-builder">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FormInput className="h-5 w-5 text-red-300" />
                Registration form
              </CardTitle>
              <p className="text-sm text-white/55">
                Full name and mobile are always included. Turn on optional fields or add your own.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {builtinFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">
                        {field.label}
                        {field.locked && (
                          <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                            always on
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-white/45">
                        {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center gap-2 text-xs text-white/70">
                        <Switch
                          checked={!!field.enabled}
                          disabled={!!field.locked}
                          onCheckedChange={(checked) =>
                            updateField(field.id, {
                              enabled: checked,
                              required: checked ? field.required : false,
                            })
                          }
                        />
                        Show
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/70">
                        <Switch
                          checked={!!field.required}
                          disabled={!!field.locked || !field.enabled}
                          onCheckedChange={(checked) =>
                            updateField(field.id, { required: checked })
                          }
                        />
                        Required
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {customFields.length > 0 && (
                <div className="space-y-2 border-t border-white/10 pt-4">
                  <p className="text-sm font-medium text-white/80">Custom fields</p>
                  {customFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-white/25" />
                        <div>
                          <p className="font-medium text-white">{field.label}</p>
                          <p className="text-xs text-white/45">
                            {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
                            {field.type === 'select' && field.options?.length
                              ? ` · ${field.options.join(', ')}`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-xs text-white/70">
                          <Switch
                            checked={!!field.enabled}
                            onCheckedChange={(checked) =>
                              updateField(field.id, {
                                enabled: checked,
                                required: checked ? field.required : false,
                              })
                            }
                          />
                          Show
                        </label>
                        <label className="flex items-center gap-2 text-xs text-white/70">
                          <Switch
                            checked={!!field.required}
                            disabled={!field.enabled}
                            onCheckedChange={(checked) =>
                              updateField(field.id, { required: checked })
                            }
                          />
                          Required
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-white/50 hover:text-red-300"
                          onClick={() => removeCustomField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 rounded-xl border border-dashed border-white/15 p-4">
                <p className="text-sm font-medium text-white">Add custom field</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-white/70">Field label</Label>
                    <Input
                      value={customDraft.label}
                      onChange={(e) =>
                        setCustomDraft({ ...customDraft, label: e.target.value })
                      }
                      placeholder="e.g. Jersey size"
                      className="border-white/20 bg-white/5 text-white placeholder:text-white/35"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/70">Field type</Label>
                    <Select
                      value={customDraft.type}
                      onValueChange={(value) =>
                        setCustomDraft({ ...customDraft, type: value })
                      }
                    >
                      <SelectTrigger className="border-white/20 bg-white/5 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {customDraft.type === 'select' && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-white/70">
                        Dropdown options (comma-separated)
                      </Label>
                      <Input
                        value={(customDraft.options || []).join(', ')}
                        onChange={(e) =>
                          setCustomDraft({
                            ...customDraft,
                            options: e.target.value.split(',').map((s) => s.trim()),
                          })
                        }
                        placeholder="S, M, L, XL"
                        className="border-white/20 bg-white/5 text-white placeholder:text-white/35"
                      />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                  onClick={addCustomField}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add field
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rules */}
          <Card className="glass border-white/15">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Gavel className="h-5 w-5 text-red-300" />
                Auction rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white/80">Min squad size</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.rules.min_squad_size}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rules: { ...formData.rules, min_squad_size: e.target.value },
                      })
                    }
                    className="border-white/20 bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Max squad size</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.rules.max_squad_size}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rules: { ...formData.rules, max_squad_size: e.target.value },
                      })
                    }
                    className="border-white/20 bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Min bid increment</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.rules.min_bid_increment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rules: { ...formData.rules, min_bid_increment: e.target.value },
                      })
                    }
                    className="border-white/20 bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Timer (seconds)</Label>
                  <Input
                    type="number"
                    min={5}
                    value={formData.rules.timer_duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rules: { ...formData.rules, timer_duration: e.target.value },
                      })
                    }
                    className="border-white/20 bg-white/5 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">RTM cards per team</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.rules.rtm_cards_per_team}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rules: { ...formData.rules, rtm_cards_per_team: e.target.value },
                      })
                    }
                    className="border-white/20 bg-white/5 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registration limit */}
          <Card className="glass border-white/15" data-testid="registration-limit-settings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-red-300" />
                Registration limit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <Label htmlFor="has-registration-limit" className="text-white/90">
                    Limit number of registrations
                  </Label>
                  <p className="text-xs text-white/50">
                    Registration closes automatically when the limit is reached
                  </p>
                </div>
                <Switch
                  id="has-registration-limit"
                  checked={formData.has_registration_limit}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      has_registration_limit: checked,
                      registration_limit: checked ? formData.registration_limit : null,
                    })
                  }
                />
              </div>
              {formData.has_registration_limit && (
                <div className="space-y-2">
                  <Label htmlFor="registration-limit" className="text-white/80">
                    Maximum registrations
                  </Label>
                  <Input
                    id="registration-limit"
                    type="number"
                    min={1}
                    placeholder="e.g. 100"
                    value={formData.registration_limit ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registration_limit: e.target.value
                          ? parseInt(e.target.value, 10)
                          : null,
                      })
                    }
                    className="border-white/20 bg-white/5 text-white"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card className="glass border-white/15">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <DollarSign className="h-5 w-5 text-red-300" />
                Registration payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <Label htmlFor="collect-payment" className="text-white/90">
                    Collect payment on registration
                  </Label>
                  <p className="text-xs text-white/50">
                    Players pay the fee during public registration
                  </p>
                </div>
                <Switch
                  id="collect-payment"
                  checked={!!formData.payment_settings.collect_payment}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      payment_settings: {
                        ...formData.payment_settings,
                        collect_payment: checked,
                      },
                    })
                  }
                />
              </div>
              {formData.payment_settings.collect_payment && (
                <div className="space-y-2">
                  <Label htmlFor="registration-fee" className="text-white/80">
                    Registration fee amount
                  </Label>
                  <Input
                    id="registration-fee"
                    type="number"
                    min={1}
                    placeholder="e.g. 500"
                    value={formData.payment_settings.registration_fee ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_settings: {
                          ...formData.payment_settings,
                          registration_fee: e.target.value
                            ? parseInt(e.target.value, 10)
                            : null,
                        },
                      })
                    }
                    className="border-white/20 bg-white/5 text-white"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link to={`/admin/auction/${eventId}`}>
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 sm:w-auto"
              >
                Live control
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={saving}
              className="bg-red-600 text-white hover:bg-red-700"
              data-testid="save-event-settings"
            >
              {saving ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
};

export default EventSettings;
