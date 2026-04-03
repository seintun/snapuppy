import { CalendarError } from './errors';
import { logger } from './logger';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { date: string; dateTime?: string };
  end: { date: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
  etag?: string;
  status?: string;
  htmlLink?: string;
  iCalUID?: string;
  updated?: string;
}

export interface CreateEventRequest {
  accessToken: string;
  calendarId: string;
  event: Omit<GoogleCalendarEvent, 'id' | 'etag' | 'htmlLink' | 'iCalUID' | 'updated' | 'status'>;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
  conferenceDataVersion?: number;
}

export interface UpdateEventRequest {
  accessToken: string;
  calendarId: string;
  eventId: string;
  event: Partial<GoogleCalendarEvent>;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
  conferenceDataVersion?: number;
}

export interface DeleteEventRequest {
  accessToken: string;
  calendarId: string;
  eventId: string;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface DeleteEventResponse {
  deleted: boolean;
  eventId: string;
  status: number;
}

export interface CheckForChangesRequest {
  accessToken: string;
  calendarId: string;
  eventId: string;
  etag?: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

export interface CheckForChangesResponse {
  changed: boolean;
  status: number;
  etag: string | null;
  event: GoogleCalendarEvent | null;
}

export interface GoogleCalendarRequestContext {
  accessToken: string;
  calendarId: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

export const GOOGLE_CALENDAR_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';
export const GOOGLE_CALENDAR_LIST_API_BASE_URL =
  'https://www.googleapis.com/calendar/v3/users/me/calendarList';
export const SNAPUPPY_CALENDAR_NAME = 'Snapuppy Bookings';

export class GoogleCalendarError extends CalendarError {
  readonly status: number | null;
  readonly code_num?: number;

  constructor(
    message: string,
    options: {
      status?: number | null;
      code?: number;
      details?: unknown;
      cause?: unknown;
    } = {},
  ) {
    super(message, options.details, options.cause);
    this.name = 'GoogleCalendarError';
    this.status = options.status ?? null;
    this.code_num = options.code;
  }
}

export async function getOrCreateSnapuppyCalendar(accessToken: string): Promise<string> {
  logger.debug('Listing calendars...');
  const listRes = await fetch(GOOGLE_CALENDAR_LIST_API_BASE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    throw new GoogleCalendarError('Failed to list Google Calendars', { status: listRes.status });
  }

  const listBody = (await listRes.json()) as { items?: Array<{ id: string; summary: string }> };
  const existing = listBody.items?.find((c) => c.summary === SNAPUPPY_CALENDAR_NAME);

  if (existing) {
    logger.debug('Found existing Snapuppy calendar', { calendarId: existing.id });
    return existing.id;
  }

  logger.info('Snapuppy calendar not found, creating new one...');
  const createRes = await fetch(`${GOOGLE_CALENDAR_API_BASE_URL}/calendars`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ summary: SNAPUPPY_CALENDAR_NAME }),
  });

  if (!createRes.ok) {
    throw new GoogleCalendarError('Failed to create Snapuppy Bookings calendar', {
      status: createRes.status,
    });
  }

  const created = (await createRes.json()) as { id: string };
  logger.info('Created new Snapuppy calendar', { calendarId: created.id });
  return created.id;
}

export async function createEvent(request: CreateEventRequest): Promise<GoogleCalendarEvent> {
  const response = await googleCalendarRequest<GoogleCalendarEvent>(request, {
    method: 'POST',
    path: ['events'],
    query: {
      sendUpdates: request.sendUpdates,
      conferenceDataVersion: request.conferenceDataVersion,
    },
    body: request.event,
  });

  return asGoogleCalendarEvent(response.body);
}

export async function updateEvent(request: UpdateEventRequest): Promise<GoogleCalendarEvent> {
  const response = await googleCalendarRequest<GoogleCalendarEvent>(request, {
    method: 'PATCH',
    path: ['events', request.eventId],
    query: {
      sendUpdates: request.sendUpdates,
      conferenceDataVersion: request.conferenceDataVersion,
    },
    body: request.event,
  });

  return asGoogleCalendarEvent(response.body);
}

export async function deleteEvent(request: DeleteEventRequest): Promise<DeleteEventResponse> {
  await googleCalendarRequest<void>(request, {
    method: 'DELETE',
    path: ['events', request.eventId],
    query: { sendUpdates: request.sendUpdates },
    allowEmptyResponse: true,
  });

  return {
    deleted: true,
    eventId: request.eventId,
    status: 204,
  };
}

export async function checkForChanges(
  request: CheckForChangesRequest,
): Promise<CheckForChangesResponse> {
  const response = await googleCalendarRequest<GoogleCalendarEvent>(request, {
    method: 'GET',
    path: ['events', request.eventId],
    extraHeaders: request.etag ? { 'If-None-Match': request.etag } : undefined,
    allowedStatuses: [200, 304],
    allowEmptyResponse: true,
  });

  if (response.status === 304) {
    return {
      changed: false,
      status: 304,
      etag: request.etag ?? null,
      event: null,
    };
  }

  return {
    changed: true,
    status: 200,
    etag: response.headers.get('etag'),
    event: asGoogleCalendarEvent(response.body),
  };
}

interface GoogleCalendarRequestDefinition {
  method: 'DELETE' | 'GET' | 'PATCH' | 'POST';
  path: string[];
  body?: unknown;
  query?: Record<string, number | string | undefined>;
  extraHeaders?: Record<string, string>;
  allowedStatuses?: number[];
  allowEmptyResponse?: boolean;
}

interface GoogleCalendarResponse<T> {
  status: number;
  headers: Headers;
  body: T;
}

async function googleCalendarRequest<T>(
  context: GoogleCalendarRequestContext,
  definition: GoogleCalendarRequestDefinition,
): Promise<GoogleCalendarResponse<T>> {
  const fetchImpl = resolveFetch(context.fetch);
  const url = buildUrl(
    context.baseUrl ?? GOOGLE_CALENDAR_API_BASE_URL,
    context.calendarId,
    definition,
  );
  const headers = new Headers({
    Accept: 'application/json',
    Authorization: `Bearer ${context.accessToken}`,
    ...definition.extraHeaders,
  });

  if (definition.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetchImpl(url, {
      method: definition.method,
      headers,
      body: definition.body === undefined ? undefined : JSON.stringify(definition.body),
      signal: context.signal,
    });
  } catch (error) {
    throw new GoogleCalendarError('Google Calendar request failed', {
      cause: error,
    });
  }

  const allowedStatuses = definition.allowedStatuses ?? [200];

  if (!allowedStatuses.includes(response.status)) {
    throw await buildGoogleCalendarError(response);
  }

  if (definition.allowEmptyResponse && response.status === 204) {
    return {
      status: response.status,
      headers: response.headers,
      body: undefined as T,
    };
  }

  const body = await parseResponseBody<T>(response);

  return {
    status: response.status,
    headers: response.headers,
    body,
  };
}

async function buildGoogleCalendarError(response: Response): Promise<GoogleCalendarError> {
  const payload = await parseUnknownResponseBody(response);
  const message =
    extractGoogleCalendarErrorMessage(payload) ??
    `Google Calendar request failed with status ${response.status}`;
  const code =
    typeof payload === 'object' && payload !== null && 'error' in payload
      ? readErrorCode((payload as { error?: unknown }).error)
      : undefined;

  return new GoogleCalendarError(message, {
    status: response.status,
    code,
    details: payload,
  });
}

function extractGoogleCalendarErrorMessage(payload: unknown): string | undefined {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const errorPayload = (payload as { error?: unknown }).error;

    if (typeof errorPayload === 'object' && errorPayload !== null && 'message' in errorPayload) {
      const message = (errorPayload as { message?: unknown }).message;
      return typeof message === 'string' ? message : undefined;
    }
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  return undefined;
}

function readErrorCode(errorPayload: unknown): number | undefined {
  if (typeof errorPayload === 'object' && errorPayload !== null && 'code' in errorPayload) {
    const code = (errorPayload as { code?: unknown }).code;
    return typeof code === 'number' ? code : undefined;
  }

  return undefined;
}

async function parseResponseBody<T>(response: Response): Promise<T> {
  const payload = await parseUnknownResponseBody(response);

  return payload as T;
}

async function parseUnknownResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as unknown;
  }

  const text = await response.text();
  return text.trim() ? text : null;
}

function asGoogleCalendarEvent(payload: unknown): GoogleCalendarEvent {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('id' in payload) ||
    !('summary' in payload)
  ) {
    throw new GoogleCalendarError('Google Calendar returned an invalid event payload', {
      details: payload,
    });
  }

  return payload as GoogleCalendarEvent;
}

function buildUrl(
  baseUrl: string,
  calendarId: string,
  definition: Pick<GoogleCalendarRequestDefinition, 'path' | 'query'>,
): string {
  const url = new URL(
    [`calendars`, encodeURIComponent(calendarId), ...definition.path.map(encodeURIComponent)].join(
      '/',
    ),
    `${baseUrl.replace(/\/$/, '')}/`,
  );

  for (const [key, value] of Object.entries(definition.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function resolveFetch(fetchImpl?: typeof fetch): typeof fetch {
  if (fetchImpl) {
    return fetchImpl;
  }

  if (typeof globalThis.fetch !== 'function') {
    throw new GoogleCalendarError('Fetch API is not available in the current runtime');
  }

  return globalThis.fetch.bind(globalThis);
}
