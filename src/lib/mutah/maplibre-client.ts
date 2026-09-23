export async function loadMapLibre() {
  const [library, worker] = await Promise.all([
    import("maplibre-gl"),
    import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"),
  ]);
  library.setWorkerUrl(worker.default);
  return library;
}
