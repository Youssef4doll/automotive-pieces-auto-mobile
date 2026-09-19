import { StyleSheet, View } from 'react-native';

import { Brand, C } from '@/constants/theme';
import { PartArtwork } from '@/illustrations/parts';

/**
 * A part family's drawing, in its disc.
 *
 * The disc is how the catalogue's families are set apart from everything
 * else on a screen: a circle reads as a category, a rounded square reads as
 * a thumbnail of a thing. That distinction is load-bearing here, because a
 * product card's tile holds either a photograph of the actual part or — for
 * most of this catalogue — the same family drawing, and those two have to
 * look like the same slot. So families are discs and products are tiles, and
 * a screen never has to decide.
 *
 * Defined once rather than in each of the three screens that draw a family.
 * It was three copies of a width, a height and a border radius for one
 * release and they had already drifted by 2pt.
 */
export function PartBadge({
  slug,
  size = 48,
  /** A family already chosen, or the one being viewed. */
  emphasis = false,
}: {
  slug: string;
  size?: number;
  emphasis?: boolean;
}) {
  return (
    <View
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: emphasis ? C.accent : C.surface,
        },
      ]}
    >
      {/*
        0.62 of the disc. The drawings are built on a 24 grid that runs almost
        edge to edge, so anything above about two thirds leaves no ring of
        colour around them and the disc stops reading as a disc.
      */}
      <PartArtwork
        slug={slug}
        size={Math.round(size * 0.62)}
        accent={emphasis ? Brand.white : Brand.navy50}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
