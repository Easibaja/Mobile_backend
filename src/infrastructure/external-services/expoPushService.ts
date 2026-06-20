import axios from 'axios';

export type ExpoPushResponse = {
  ok: boolean;
  id?: string;
  error?: string;
  details?: Record<string, unknown>;
};

function isExpoPushToken(token: string): boolean {
  return /^ExponentPushToken\[[^\]]+\]$/.test(token);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractFirstTicket(payload: unknown): Record<string, unknown> | undefined {
  if (!isRecord(payload) || !('data' in payload)) {
    return undefined;
  }

  const data = payload.data;
  if (Array.isArray(data)) {
    const first = data[0];
    return isRecord(first) ? first : undefined;
  }

  return isRecord(data) ? data : undefined;
}

function extractExpoErrorMessage(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  const errors = payload.errors;
  if (Array.isArray(errors)) {
    const firstError = errors[0];
    if (isRecord(firstError) && typeof firstError.message === 'string') {
      return firstError.message;
    }
  }

  return undefined;
}

export class ExpoPushService {
  private readonly endpoint = 'https://exp.host/--/api/v2/push/send';

  async send(input: {
    token: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<ExpoPushResponse> {
    if (!isExpoPushToken(input.token)) {
      return {
        ok: false,
        error: 'InvalidExpoPushToken',
      };
    }

    try {
      const response = await axios.post(
        this.endpoint,
        {
          to: input.token,
          title: input.title,
          body: input.body,
          data: input.data,
          sound: 'default',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const ticket = extractFirstTicket(response.data);
      if (!ticket) {
        return {
          ok: false,
          error: 'ExpoMalformedResponse',
          details: isRecord(response.data) ? response.data : undefined,
        };
      }

      if (ticket.status === 'ok') {
        return {
          ok: true,
          id: typeof ticket.id === 'string' ? ticket.id : undefined,
        };
      }

      const details = isRecord(ticket.details) ? ticket.details : undefined;
      const detailsError = typeof details?.error === 'string' ? details.error : undefined;
      const message = typeof ticket.message === 'string' ? ticket.message : undefined;

      return {
        ok: false,
        error: message ?? detailsError ?? 'ExpoPushError',
        details,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const payload = error.response?.data;
        const providerMessage = extractExpoErrorMessage(payload);

        return {
          ok: false,
          error:
            providerMessage ??
            (statusCode ? `ExpoHttpError:${statusCode}` : 'ExpoNetworkError'),
          details: isRecord(payload) ? payload : undefined,
        };
      }

      return {
        ok: false,
        error: error instanceof Error ? error.message : 'UnexpectedExpoPushError',
      };
    }
  }
}
