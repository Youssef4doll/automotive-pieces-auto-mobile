import { useRef } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';

import { useI18n } from '@/i18n/provider';

/**
 * A horizontal row that scrolls — families, chips, makes.
 *
 * Under Arabic the app lays rows out right-to-left itself (`row-reverse`),
 * so the first item sits at the right-hand end of the content. A plain
 * horizontal ScrollView still opens at the left, which showed an Arabic
 * reader the LAST items first. The rail opens at the end instead, and keeps
 * it there as its content arrives.
 */
export function Rail({ onContentSizeChange, ...props }: ScrollViewProps) {
  const { rtl } = useI18n();
  const ref = useRef<ScrollView>(null);
  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      {...props}
      onContentSizeChange={(w, h) => {
        if (rtl) ref.current?.scrollToEnd({ animated: false });
        onContentSizeChange?.(w, h);
      }}
    />
  );
}
