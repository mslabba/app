/**
 * Registration form configuration helpers (shared by EventSettings + public form).
 */

export const FIELD_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'image', label: 'Image upload' },
  { value: 'file', label: 'File upload' },
];

/** Keys stored on registration root columns (not extra_fields). */
export const COLUMN_KEYS = new Set([
  'name',
  'age',
  'position',
  'specialty',
  'previous_team',
  'cricheroes_link',
  'contact_number',
  'email',
  'photo_url',
  'district',
  'identity_proof_url',
]);

/**
 * Keys stored on player table columns (admin add/edit player).
 * email / date_of_birth / state / custom keys go to player.extra_fields.
 */
export const PLAYER_COLUMN_KEYS = new Set([
  'name',
  'age',
  'position',
  'specialty',
  'previous_team',
  'cricheroes_link',
  'contact_number',
  'photo_url',
  'district',
  'identity_proof_url',
]);

/** Nested stats keys */
export const STATS_KEYS = new Set(['matches', 'runs', 'wickets', 'goals', 'assists']);

export function builtinCatalog() {
  return [
    {
      id: 'name',
      key: 'name',
      label: 'Full name',
      type: 'text',
      enabled: true,
      required: true,
      builtin: true,
      locked: true,
      placeholder: 'Enter your full name',
    },
    {
      id: 'contact_number',
      key: 'contact_number',
      label: 'Mobile number',
      type: 'tel',
      enabled: true,
      required: true,
      builtin: true,
      locked: true,
      placeholder: '+91 …',
    },
    {
      id: 'email',
      key: 'email',
      label: 'Email address',
      type: 'email',
      enabled: false,
      required: false,
      builtin: true,
      placeholder: 'you@example.com',
    },
    {
      id: 'age',
      key: 'age',
      label: 'Age',
      type: 'number',
      enabled: false,
      required: false,
      builtin: true,
      placeholder: 'Age',
    },
    {
      id: 'date_of_birth',
      key: 'date_of_birth',
      label: 'Date of birth',
      type: 'date',
      enabled: false,
      required: false,
      builtin: true,
    },
    {
      id: 'district',
      key: 'district',
      label: 'District',
      type: 'text',
      enabled: false,
      required: false,
      builtin: true,
      placeholder: 'District',
    },
    {
      id: 'state',
      key: 'state',
      label: 'State',
      type: 'text',
      enabled: false,
      required: false,
      builtin: true,
      placeholder: 'State',
    },
    {
      id: 'position',
      key: 'position',
      label: 'Position / role',
      type: 'text',
      enabled: false,
      required: false,
      builtin: true,
      placeholder: 'e.g. Batsman, Forward',
    },
    {
      id: 'specialty',
      key: 'specialty',
      label: 'Specialty',
      type: 'text',
      enabled: false,
      required: false,
      builtin: true,
      placeholder: 'e.g. Right-handed',
    },
    {
      id: 'previous_team',
      key: 'previous_team',
      label: 'Previous team',
      type: 'text',
      enabled: false,
      required: false,
      builtin: true,
    },
    {
      id: 'cricheroes_link',
      key: 'cricheroes_link',
      label: 'CricHeroes / profile link',
      type: 'text',
      enabled: false,
      required: false,
      builtin: true,
      placeholder: 'https://…',
    },
    {
      id: 'photo_url',
      key: 'photo_url',
      label: 'Player photo',
      type: 'image',
      enabled: false,
      required: false,
      builtin: true,
    },
    {
      id: 'identity_proof_url',
      key: 'identity_proof_url',
      label: 'ID proof',
      type: 'file',
      enabled: false,
      required: false,
      builtin: true,
    },
    {
      id: 'matches',
      key: 'matches',
      label: 'Matches played',
      type: 'number',
      enabled: false,
      required: false,
      builtin: true,
    },
    {
      id: 'runs',
      key: 'runs',
      label: 'Runs / goals',
      type: 'number',
      enabled: false,
      required: false,
      builtin: true,
    },
    {
      id: 'wickets',
      key: 'wickets',
      label: 'Wickets / assists',
      type: 'number',
      enabled: false,
      required: false,
      builtin: true,
    },
  ];
}

/** New auctions / when organizer opens settings for the first time. */
export function defaultRegistrationFormConfig() {
  return { fields: builtinCatalog() };
}

/**
 * Legacy events with no config: keep previous public form behaviour
 * (most fields shown; name, mobile, photo required).
 */
export function legacyRegistrationFormConfig() {
  const fields = builtinCatalog().map((f) => {
    const alwaysOn = new Set([
      'name',
      'contact_number',
      'age',
      'email',
      'district',
      'position',
      'specialty',
      'previous_team',
      'cricheroes_link',
      'photo_url',
      'identity_proof_url',
      'matches',
      'runs',
      'wickets',
    ]);
    if (!alwaysOn.has(f.key)) return f;
    return {
      ...f,
      enabled: true,
      required: f.key === 'name' || f.key === 'contact_number' || f.key === 'photo_url',
    };
  });
  return { fields };
}

export function resolveRegistrationFormConfig(eventOrConfig) {
  const cfg =
    eventOrConfig?.registration_form_config ||
    (eventOrConfig?.fields ? eventOrConfig : null);
  if (cfg?.fields?.length) {
    // Merge missing builtins so new catalog keys appear in settings
    const byId = new Map(cfg.fields.map((f) => [f.id || f.key, f]));
    const merged = builtinCatalog().map((b) => {
      const existing = byId.get(b.id) || byId.get(b.key);
      if (!existing) return b;
      return {
        ...b,
        ...existing,
        id: existing.id || b.id,
        key: existing.key || b.key,
        builtin: true,
        locked: !!b.locked,
        enabled: b.locked ? true : !!existing.enabled,
        required: b.locked ? true : !!existing.required,
      };
    });
    // Append custom fields (non-builtin) from saved config
    cfg.fields.forEach((f) => {
      if (f.builtin) return;
      if (merged.some((m) => m.id === f.id || m.key === f.key)) return;
      merged.push({
        ...f,
        builtin: false,
        locked: false,
        enabled: f.enabled !== false,
      });
    });
    return { fields: merged };
  }
  return legacyRegistrationFormConfig();
}

export function enabledFields(config) {
  return (config?.fields || []).filter((f) => f.enabled);
}

export function emptyFormValues(config) {
  const values = { stats: { matches: '', runs: '', wickets: '', goals: '', assists: '' }, extra_fields: {} };
  (config?.fields || []).forEach((f) => {
    if (!f.enabled) return;
    if (STATS_KEYS.has(f.key)) {
      values.stats[f.key] = '';
    } else if (COLUMN_KEYS.has(f.key)) {
      values[f.key] = '';
    } else {
      values.extra_fields[f.key] = '';
    }
  });
  // Always ensure core keys exist for payment flow
  if (values.name === undefined) values.name = '';
  if (values.contact_number === undefined) values.contact_number = '';
  return values;
}

export function buildRegistrationPayload(values, config) {
  const enabled = enabledFields(config);
  const payload = {
    name: (values.name || '').trim(),
    contact_number: (values.contact_number || '').trim() || null,
    age: null,
    position: null,
    specialty: null,
    previous_team: null,
    cricheroes_link: null,
    email: null,
    photo_url: null,
    district: null,
    identity_proof_url: null,
    stats: {},
    extra_fields: {},
  };

  enabled.forEach((f) => {
    let raw;
    if (STATS_KEYS.has(f.key)) {
      raw = values.stats?.[f.key];
    } else if (COLUMN_KEYS.has(f.key)) {
      raw = values[f.key];
    } else {
      raw = values.extra_fields?.[f.key] ?? values[f.key];
    }

    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return;
    }

    if (f.key === 'age' || STATS_KEYS.has(f.key)) {
      const n = parseInt(raw, 10);
      if (Number.isNaN(n)) return;
      if (STATS_KEYS.has(f.key)) {
        payload.stats[f.key] = n;
      } else {
        payload.age = n;
      }
      return;
    }

    if (COLUMN_KEYS.has(f.key)) {
      payload[f.key] = String(raw).trim();
    } else {
      payload.extra_fields[f.key] = String(raw).trim();
    }
  });

  if (!Object.keys(payload.stats).length) {
    payload.stats = null;
  }
  if (!Object.keys(payload.extra_fields).length) {
    payload.extra_fields = null;
  }

  return payload;
}

export function validateRegistrationValues(values, config) {
  for (const f of enabledFields(config)) {
    if (!f.required) continue;
    let raw;
    if (STATS_KEYS.has(f.key)) raw = values.stats?.[f.key];
    else if (COLUMN_KEYS.has(f.key)) raw = values[f.key];
    else raw = values.extra_fields?.[f.key];
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return `${f.label} is required`;
    }
  }
  return null;
}

export function newCustomField() {
  const id = `custom_${Date.now().toString(36)}`;
  return {
    id,
    key: id,
    label: '',
    type: 'text',
    enabled: true,
    required: false,
    builtin: false,
    locked: false,
    options: [],
    placeholder: '',
  };
}

/** Admin player form values: auction fields + registration form values */
export function emptyAdminPlayerFormValues(config) {
  const reg = emptyFormValues(config);
  return {
    category_id: '',
    base_price: '',
    is_priority: false,
    ...reg,
  };
}

/**
 * Build PlayerCreate payload from admin form + event form config.
 * Always includes category_id + base_price (auction ops fields).
 */
export function buildAdminPlayerPayload(values, config) {
  const reg = buildRegistrationPayload(values, config);
  // Map registration payload; email is not a player column → extra_fields
  const extra = { ...(reg.extra_fields || {}) };
  if (reg.email) {
    extra.email = reg.email;
  }
  // buildRegistrationPayload puts email on root for registrations
  const payload = {
    name: reg.name,
    category_id: values.category_id,
    base_price: parseInt(values.base_price, 10) || 0,
    age: reg.age,
    position: reg.position,
    specialty: reg.specialty,
    previous_team: reg.previous_team,
    cricheroes_link: reg.cricheroes_link,
    contact_number: reg.contact_number,
    photo_url: reg.photo_url,
    district: reg.district,
    identity_proof_url: reg.identity_proof_url,
    stats: reg.stats,
    is_priority: !!values.is_priority,
    extra_fields: Object.keys(extra).length ? extra : null,
  };
  return payload;
}

export function playerToAdminFormValues(player, config) {
  const base = emptyAdminPlayerFormValues(config);
  const extra = player.extra_fields || {};
  return {
    ...base,
    category_id: player.category_id || '',
    base_price: player.base_price != null ? String(player.base_price) : '',
    is_priority: !!player.is_priority,
    name: player.name || '',
    age: player.age != null ? String(player.age) : '',
    position: player.position || '',
    specialty: player.specialty || '',
    previous_team: player.previous_team || '',
    cricheroes_link: player.cricheroes_link || '',
    contact_number: player.contact_number || '',
    photo_url: player.photo_url || '',
    district: player.district || '',
    identity_proof_url: player.identity_proof_url || '',
    email: extra.email || '',
    stats: {
      matches: player.stats?.matches != null ? String(player.stats.matches) : '',
      runs: player.stats?.runs != null ? String(player.stats.runs) : '',
      wickets: player.stats?.wickets != null ? String(player.stats.wickets) : '',
      goals: player.stats?.goals != null ? String(player.stats.goals) : '',
      assists: player.stats?.assists != null ? String(player.stats.assists) : '',
    },
    extra_fields: {
      ...base.extra_fields,
      ...extra,
    },
  };
}
