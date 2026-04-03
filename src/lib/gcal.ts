export const GOOGLE_CALENDAR_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';

export interface GoogleCalendarEventDateTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

export interface GoogleCalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus?: 'accepted' | 'declined' | 'needsAction' | 'tentative';
  optional?: boolean;
  organizer?: boolean;
  self?: boolean;
}

export interface GoogleCalendarReminderOverride {
  method: 'email' | 'popup';
  minutes: number;
}

export interface GoogleCalendarReminders {
  useDefault?: boolean;
  overrides?: GoogleCalendarReminderOverride[];
}

export interface GoogleCalendarEventInput {
  summary?: string;
  description?: string;
  location?: string;
  start: GoogleCalendarEventDateTime;
  end: GoogleCalendarEventDateTime;
  attendees?: GoogleCalendarAttendee[];
  colorId?: string;
  reminders?: GoogleCalendarReminders;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
}

export interface GoogleCalendarEvent extends GoogleCalendarEventInput {
  id: string;
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
  etag?: string;
}

export interface GoogleCalendarRequestContext {
  accessToken: string;
  calendarId: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
  baseUrl?: string;
}

export interface CreateEventRequest extends GoogleCalendarRequestContext {
  event: GoogleCalendarEventInput;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
  conferenceDataVersion?: number;
}

export interface UpdateEventRequest extends GoogleCalendarRequestContext {
  eventId: string;
  event: Partial<GoogleCalendarEventInput>;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
  conferenceDataVersion?: number;
}

export interface DeleteEventRequest extends GoogleCalendarRequestContext {
  eventId: string;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface DeleteEventResponse {
  deleted: true;
  eventId: string;
  status: 204;
}

export interface CheckForChangesRequest extends GoogleCalendarRequestContext {
  eventId: string;
  etag?: string;
}

export type CheckForChangesResponse =
  | {
      changed: false;
      status: 304;
      etag: string | null;
      event: null;
    }
  | {
      changed: true;
      status: 200;
      etag: string | null;
      event: GoogleCalendarEvent;
    };

export class GoogleCalendarError extends Error {
  readonly status: number | null;
  readonly code?: number;
  readonly details?: unknown;
  override readonly cause?: unknown;

  constructor(
    message: string,
    options: {
      status?: number | null;
      code?: number;
      details?: unknown;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'GoogleCalendarError';
    this.status = options.status ?? null;
    this.code = options.code;
    this.details = options.details;
    this.cause = options.cause;
  }
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
  await googleCalendarRequest<null>(request, {
    method: 'DELETE',
    path: ['events', request.eventId],
    query: { sendUpdates: request.sendUpdates },
    allowEmptyResponse: true,
    allowedStatuses: [204],
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
  const response = await googleCalendarRequest<GoogleCalendarEvent | null>(request, {
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
  const url = buildUrl(context.baseUrl ?? GOOGLE_CALENDAR_API_BASE_URL, context.calendarId, definition);
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
      body: null as T,
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
  if (typeof payload !== 'object' || payload === null || !('id' in payload)) {
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
    ['calendars', encodeURIComponent(calendarId), ...definition.path.map(encodeURIComponent)].join('/'),
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
