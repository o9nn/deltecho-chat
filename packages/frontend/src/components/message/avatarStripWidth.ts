/** Standing-figure fallback until the Live2D model reports mesh bounds. */
export const DEFAULT_AVATAR_ASPECT = 0.55;

export const AVATAR_STRIP_MIN_WIDTH = 180;
export const AVATAR_STRIP_MAX_PANE_FRACTION = 0.55;

/**
 * Strip width that lets contain-fit hit the height limit first.
 * A narrower strip width-caps the figure and leaves empty space above/below.
 */
export function optimalAvatarStripWidth(
  paneHeight: number,
  paneWidth: number,
  aspectWidthOverHeight = DEFAULT_AVATAR_ASPECT,
): number {
  const height = Math.max(0, paneHeight);
  const width = Math.max(0, paneWidth);
  const aspect = Math.min(2, Math.max(0.2, aspectWidthOverHeight));
  const raw = height > 0 ? Math.round(height * aspect) : AVATAR_STRIP_MIN_WIDTH;
  const maxFromPane =
    width > 0 ? Math.round(width * AVATAR_STRIP_MAX_PANE_FRACTION) : raw;
  const maxWidth = Math.max(AVATAR_STRIP_MIN_WIDTH, maxFromPane);
  return Math.min(Math.max(raw, AVATAR_STRIP_MIN_WIDTH), maxWidth);
}

export function clampAvatarStripWidth(
  nextWidth: number,
  paneWidth: number,
): number {
  const maxFromPane =
    paneWidth > 0
      ? Math.round(paneWidth * AVATAR_STRIP_MAX_PANE_FRACTION)
      : nextWidth;
  const maxWidth = Math.max(AVATAR_STRIP_MIN_WIDTH, maxFromPane);
  return Math.min(Math.max(Math.round(nextWidth), AVATAR_STRIP_MIN_WIDTH), maxWidth);
}
