import covers from '../data/rendered-covers.json' with {type:'json'};
// Export mode renders the original artwork plus live type, never an already flattened cover.
export function renderedCover(source) {
  return process.env.AWB_EXPORT_COVERS === '1' ? null : covers[source] ?? null;
}
export function publicCover(source) { return renderedCover(source)?.src ?? source; }
