import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { API_BASE_URL } from '@/constants/config';
import { Brand } from '@/constants/theme';
import { PartArtwork } from '@/illustrations/parts';
import { familyRender } from '@/illustrations/renders';
import { useI18n } from '@/i18n/provider';
import { Text } from './text';

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
 *   2. otherwise the family's studio render bundled in the app
 *      (illustrations/renders) — a photograph-like picture of that kind of
 *      part, branded by nobody;
 *   3. for a family nobody has rendered yet, the website's illustration,
 *      /api/part-art/<slug>.svg, and offline the bundled copy of it.
 *
 * `tagIllustration` is for a *product*: when what is shown is not a
 * photograph of that product, a small "Illustration" says so on it. A
 * family's own tile needs no tag — it is a picture of the family.
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
  tagIllustration = false,
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
  /** A product shown without its own photograph: say so on the picture. */
  tagIllustration?: boolean;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  const render = familyRender(slug);

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

  if (render) {
    return (
      <View style={{ width: size, height: size }}>
        <Image source={render} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel={label} />
        {tagIllustration && size >= 64 ? <IllustrationTag small={size < 120} /> : null}
      </View>
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

function IllustrationTag({ small }: { small: boolean }) {
  const { t, rtl } = useI18n();
  return (
    <View style={[styles.tag, rtl ? { left: 0 } : { right: 0 }, small && styles.tagSmall]} pointerEvents="none">
      <Text style={[styles.tagText, small && styles.tagTextSmall]}>{t('look.illustration')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(8,22,51,0.62)',
  },
  tagSmall: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  tagText: { fontSize: 11, lineHeight: 14, color: Brand.white },
  tagTextSmall: { fontSize: 9, lineHeight: 12 },
});
