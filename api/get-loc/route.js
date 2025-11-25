export async function GET() {
  if (!globalThis.lastLocation) {
    return Response.json({ lat: null, lng: null });
  }
  return Response.json(globalThis.lastLocation);
}
