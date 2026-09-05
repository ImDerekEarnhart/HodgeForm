export class RequestBodyError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "RequestBodyError";
    this.status = status;
  }
}

/** Bound bytes before JSON/form parsing, including requests without Content-Length. */
export async function boundedRequestBody(request: Request, maxBytes = 1_048_576, timeoutMs = 10_000): Promise<Request> {
  if (!request.body) return request;
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    void request.body.cancel().catch(() => undefined);
    throw new RequestBodyError(413, "Request body exceeds the allowed size");
  }
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RequestBodyError(408, "Request body timed out")), timeoutMs);
  });
  const chunks: Uint8Array[] = [];
  let total = 0;
  let completed = false;
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), deadline]);
      if (done) { completed = true; break; }
      total += value.byteLength;
      if (total > maxBytes) throw new RequestBodyError(413, "Request body exceeds the allowed size");
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    const headers = new Headers(request.headers);
    headers.delete("transfer-encoding");
    headers.set("content-length", String(total));
    return new Request(request, { headers, body });
  } finally {
    clearTimeout(timer);
    if (!completed) void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
