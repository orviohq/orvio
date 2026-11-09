/** Keep an explicit selection only while it remains in the deduplicated view.
 * A hidden older pin resolves to its visible video peer, never an unrelated pin.
 */
export function visibleLibrarySelection(
  current: number,
  visible: number[],
  videoFor: (index: number) => string | undefined,
): number {
  if (visible.includes(current)) return current;
  const video = videoFor(current);
  return (
    (video ? visible.find((index) => videoFor(index) === video) : undefined) ??
    visible[0] ??
    0
  );
}
