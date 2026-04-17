/**
 * Shared payment utilities.
 *
 * Kept framework-agnostic (no React, no Supabase) so they can be used in both
 * React components and pure-TS template builders without circular deps.
 */

import type { PaymentMethod } from '@/lib/schemas';

// ── Phone formatting ──────────────────────────────────────────────────────────

/**
 * Formats a raw digit string as a US phone number for *display* only.
 * Returns the original value unchanged when it doesn't match exactly 10 digits.
 *
 *   "2125551234" → "(212) 555-1234"
 */
export function formatPhoneUS(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Progressive phone formatter for controlled input fields.
 * Returns a partially formatted number as the user types.
 *
 *   "212"       → "(212"
 *   "21255"     → "(212) 55"
 *   "2125551234"→ "(212) 555-1234"
 */
export function formatPhoneProgressive(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

// ── Zelle handle normalisation ────────────────────────────────────────────────

/** Returns true when `value` looks like a phone number (no `@`, only digit-safe chars). */
export function isZellePhone(value: string): boolean {
  return /^[0-9\s()\-+.]+$/.test(value) && !value.includes('@');
}

/**
 * Strips formatting characters from a Zelle phone input so the raw 10-digit
 * string is stored (matching the schema's usPhoneRegex).
 * Email handles are returned unchanged.
 */
export function normalizeZelleHandle(handle: string): string {
  if (isZellePhone(handle)) return handle.replace(/\D/g, '');
  return handle;
}

// ── JSON parsing ──────────────────────────────────────────────────────────────

/**
 * Robustly parses a `payment_instructions` DB column value into a typed array.
 *
 * Handles the edge cases that have accumulated in production:
 *   - HTML-entity-escaped JSON (double-saved through escapeHtml)
 *   - Double-stringified JSON (`'"[...]"'`)
 *   - Legacy free-text strings (returns null — caller falls back to plain text)
 */
export function parsePaymentMethodsJson(raw: string | null | undefined): PaymentMethod[] | null {
  if (!raw) return null;

  try {
    // 1. Undo any HTML-entity escaping that may have been applied before storage.
    let str = raw
      .trim()
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'");

    // 2. Unwrap double-stringified value: `"\"[...]\""` → `"[...]"`
    if (str.startsWith('"') && str.endsWith('"')) {
      str = JSON.parse(str) as string;
    }

    if (!str.startsWith('[') || !str.endsWith(']')) return null;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let parsed = JSON.parse(str);

    // 3. A third layer of stringification (rare but seen in early data).
    if (typeof parsed === 'string') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      parsed = JSON.parse(parsed);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    // Narrow to PaymentMethod[]: each item must have a recognised `type`.
    const valid = (parsed as unknown[]).filter(
      (m): m is PaymentMethod =>
        m !== null &&
        typeof m === 'object' &&
        'type' in (m as object) &&
        ['venmo', 'cashapp', 'zelle'].includes((m as { type: string }).type),
    );

    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}
