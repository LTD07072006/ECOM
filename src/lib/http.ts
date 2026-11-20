export function json<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function error(message: string, status: number) {
  return json({ error: message }, { status });
}
