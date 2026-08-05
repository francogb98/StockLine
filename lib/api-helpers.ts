export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(
  message: string,
  status = 500,
  data?: Record<string, unknown>,
) {
  return new Response(JSON.stringify({ error: message, ...data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
