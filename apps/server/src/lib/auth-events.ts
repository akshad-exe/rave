export interface AuthEvent {
  event: string;
  reason?: string;
  userId?: string;
}

interface AuthPayload {
  user?: {
    id?: string;
  };
}

function parsePayload(body: string | undefined): AuthPayload | null {
  if (!body) {
    return null;
  }
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed === "object") {
      return parsed as AuthPayload;
    }
  } catch {
    // Non-JSON bodies are not auth payloads.
  }
  return null;
}

function extractUserId(body: string | undefined): string | undefined {
  return parsePayload(body)?.user?.id;
}

function deriveFailureReason(body: string | undefined): string {
  if (!body) {
    return "invalid_request";
  }
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object") {
      const { message, statusText } = parsed as {
        message?: unknown;
        statusText?: unknown;
      };
      if (typeof statusText === "string") {
        return statusText;
      }
      if (typeof message === "string") {
        return message;
      }
    }
  } catch {
    // Ignore malformed failure payloads.
  }
  return "invalid_request";
}

export function createAuthEvent(
  action: string,
  status: number,
  body?: string
): AuthEvent | undefined {
  const isSuccess = status >= 200 && status < 300;

  if (action === "sign-in/email") {
    if (isSuccess) {
      return { event: "auth.sign_in", userId: extractUserId(body) };
    }
    if (status === 401) {
      return {
        event: "auth.sign_in_failed",
        reason: deriveFailureReason(body),
      };
    }
    return undefined;
  }

  if (action === "sign-up/email") {
    if (isSuccess) {
      return { event: "auth.sign_up", userId: extractUserId(body) };
    }
    return undefined;
  }

  if (action === "sign-out" && isSuccess) {
    return { event: "auth.sign_out" };
  }

  return undefined;
}
