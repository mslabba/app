import * as XLSX from 'xlsx';
import { exportRegistrationsToExcel, exportAllToExcel } from './excelExporter';

// The `@/` alias is webpack-only and does not resolve under Jest, so mock the
// one function the exporter needs from it — faithfully (one {label, value}
// per extra field, value stringified), without touching the Jest config.
jest.mock('@/lib/registrationFormConfig', () => ({
  describeExtraFields: (_event, extraFields) => {
    if (!extraFields || typeof extraFields !== 'object') return [];
    return Object.keys(extraFields).map((key) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value: String(extraFields[key] ?? ''),
    }));
  },
}), { virtual: true });

// Run the real xlsx serializer (where the 32,767-characters-per-cell check
// lives) without touching the filesystem or triggering a browser download.
jest.mock('xlsx', () => {
  const actual = jest.requireActual('xlsx');
  return {
    ...actual,
    writeFile: jest.fn((workbook) => {
      actual.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    }),
  };
});

const event = { name: 'Demo Premier League' };
const categories = [{ id: 'cat1', name: 'Senior' }];

const makeReg = (overrides = {}) => ({
  name: 'Test Player',
  status: 'pending_approval',
  email: 'test@example.com',
  contact_number: '9876543210',
  age: 25,
  position: 'Batsman',
  category_id: 'cat1',
  ...overrides,
});

const firstSheetRows = () => {
  const workbook = XLSX.writeFile.mock.calls[0][0];
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
};

describe('excel export cell-length guard', () => {
  beforeEach(() => {
    XLSX.writeFile.mockClear();
  });

  test('a base64 photo does not break the export and is replaced with a placeholder', () => {
    const bigDataUri = 'data:image/jpeg;base64,' + 'A'.repeat(100000);
    const reg = makeReg({ photo_url: bigDataUri });

    expect(() =>
      exportRegistrationsToExcel([reg], [], categories, event, 'all')
    ).not.toThrow();

    const rows = firstSheetRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]['Photo URL']).toBe('Photo attached (data URI, not exported)');
    expect(JSON.stringify(rows)).not.toContain('data:image/jpeg;base64');
  });

  test('a base64 ID proof is replaced with its own placeholder', () => {
    const bigDataUri = 'data:application/pdf;base64,' + 'B'.repeat(100000);
    const reg = makeReg({ identity_proof_url: bigDataUri });

    expect(() =>
      exportRegistrationsToExcel([reg], [], categories, event, 'all')
    ).not.toThrow();

    expect(firstSheetRows()[0]['ID Proof URL']).toBe(
      'ID proof attached (data URI, not exported)'
    );
  });

  test('a cell value over 32,767 characters is capped and the export succeeds', () => {
    const longText = 'x'.repeat(40000);
    const reg = makeReg({
      specialty: longText,
      extra_fields: { notes: 'y'.repeat(40000) },
    });

    expect(() =>
      exportRegistrationsToExcel([reg], [], categories, event, 'all')
    ).not.toThrow();

    const row = firstSheetRows()[0];
    const stringValues = Object.values(row).filter((v) => typeof v === 'string');
    expect(stringValues.length).toBeGreaterThan(0);
    stringValues.forEach((v) => expect(v.length).toBeLessThanOrEqual(32767));
    expect(row['Specialty']).toHaveLength(32767);
    expect(row['Specialty'].endsWith('… (truncated)')).toBe(true);
    // The long custom field is capped, not dropped.
    const notesValue = Object.entries(row).find(([k]) =>
      k.toLowerCase().includes('notes')
    )?.[1];
    expect(notesValue).toHaveLength(32767);
  });

  test('exportAllToExcel with a base64 photo exports without throwing', () => {
    const bigDataUri = 'data:image/jpeg;base64,' + 'A'.repeat(100000);
    const reg = makeReg({ photo_url: bigDataUri });

    expect(() =>
      exportAllToExcel([reg], [], categories, event)
    ).not.toThrow();

    const rows = firstSheetRows();
    expect(rows[0]['Photo URL']).toBe('Photo attached (data URI, not exported)');
  });

  test('exportAllToExcel with no data throws "No data to export"', () => {
    expect(() => exportAllToExcel([], [], categories, event)).toThrow(
      'No data to export'
    );
  });
});
