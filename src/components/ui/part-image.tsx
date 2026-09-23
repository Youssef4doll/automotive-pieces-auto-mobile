import { Image } from 'expo-image';
import { useState } from 'react';

import { API_BASE_URL } from '@/constants/config';
import { PartArtwork } from '@/illustrations/parts';

/**
 * The picture for a part or a family — always the shop's own, from the
 * website the owner manages in /admin.
 *
 * In order:
 *
 *   1. the photograph or image uploaded in the admin (`imageUrl`, served
 *      from the website's /api/images/<id>) — a product photo from
 *      /admin/catalogue's product form, a family picture from its category
 *      form;
 *   2. otherwise the website's illustration for the family,
 *      /api/part-art/<slug>.svg — navy outline, flat metal, one yellow
 *      accent — so a drawing changed on the website changes here with no
 *      app release;
 *   3. only if the phone cannot reach the shop at all, the copy of those
 *      drawings bundled in the app, so a tile is never an empty square
 *      offline.
 *
 * `size` is the square the picture fills; photos are contained, never
 * cropped — a brake pad cropped square loses the shape that identifies it.
 */
export function PartImage({
  slug,
  imageUrl,
  size,
  label,
  fit = 'contain',
}: {
  /** The family (or category) slug, for the drawing. */
  slug: string;
  imageUrl?: string | null;
  size: number;
  label?: string;
  /**
   * `cover` for a family's picture in a round tile, which should fill it;
   * `contain` (the default) for a part photo, which must never be cropped.
   */
  fit?: 'contain' | 'cover';
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);

  if (imageUrl && !photoFailed) {
    return (
      <Image
        source={{ uri: imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}` }}
        style={{ width: size, height: size }}
        contentFit={fit}
        transition={120}
        accessibilityLabel={label}
        onError={() => setPhotoFailed(true)}
      />
    );
  }

  if (!iconFailed) {
    return (
      <Image
        source={{ uri: `${API_BASE_URL}/api/part-art/${encodeURIComponent(slug)}.svg` }}
        style={{ width: size, height: size }}
        contentFit="contain"
        // Cached across launches: the drawings change when the shop edits
        // them, not every session, and the tile should not flash empty.
        cachePolicy="memory-disk"
        accessibilityLabel={label}
        onError={() => setIconFailed(true)}
      />
    );
  }

  return <PartArtwork slug={slug} size={size} />;
}
