import { LeadStatus } from './api';

export interface CsvLeadRow {
  name: string;
  email: string;
  phone?: string;
  source?: string;
  status?: LeadStatus;
  notes?: string;
}

export interface CsvParseResult {
  leads: CsvLeadRow[];
  errors: string[];
}

const VALID_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost'];

const HEADER_MAP: Record<string, keyof CsvLeadRow> = {
  name: 'name',
  'full name': 'name',
  fullname: 'name',
  email: 'email',
  'e-mail': 'email',
  phone: 'phone',
  mobile: 'phone',
  tel: 'phone',
  telephone: 'phone',
  source: 'source',
  status: 'status',
  notes: 'notes',
  note: 'notes',
};

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCsv(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0);
  return lines.map(parseCsvLine);
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function parseLeadsCsv(text: string): CsvParseResult {
  const rows = parseCsv(text);
  const errors: string[] = [];
  const leads: CsvLeadRow[] = [];

  if (rows.length < 2) {
    return { leads: [], errors: ['CSV must include a header row and at least one data row.'] };
  }

  const [headerRow, ...dataRows] = rows;
  const columnMap: (keyof CsvLeadRow | null)[] = headerRow.map((header) => {
    const key = HEADER_MAP[normalizeHeader(header)];
    return key || null;
  });

  if (!columnMap.includes('name') || !columnMap.includes('email')) {
    return {
      leads: [],
      errors: ['CSV must include "name" and "email" columns.'],
    };
  }

  const seenEmails = new Set<string>();

  dataRows.forEach((row, index) => {
    const rowNum = index + 2;
    const lead: Partial<CsvLeadRow> = {};

    columnMap.forEach((field, colIndex) => {
      if (!field) return;
      const value = (row[colIndex] || '').trim();
      if (value) {
        lead[field] = value as never;
      }
    });

    if (!lead.name && !lead.email) {
      return;
    }

    if (!lead.name || !lead.email) {
      errors.push(`Row ${rowNum}: name and email are required.`);
      return;
    }

    if (lead.status && !VALID_STATUSES.includes(lead.status)) {
      errors.push(`Row ${rowNum}: invalid status "${lead.status}".`);
      return;
    }

    const normalizedEmail = lead.email.trim().toLowerCase();
    if (seenEmails.has(normalizedEmail)) {
      errors.push(`Row ${rowNum}: skipped duplicate in CSV (${lead.email}).`);
      return;
    }
    seenEmails.add(normalizedEmail);

    leads.push({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source || 'csv',
      status: lead.status || 'new',
      notes: lead.notes,
    });
  });

  if (leads.length === 0 && errors.length === 0) {
    errors.push('No valid lead rows found in the CSV.');
  }

  return { leads, errors };
}

export const CSV_IMPORT_TEMPLATE = `name,email,phone,source,status,notes
Jane Doe,jane@example.com,555-0100,website,new,Interested in demo
John Smith,john@example.com,,referral,new,
`;
