import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Has the customer asked their phone to stop moving things?
 *
 * Reanimated's `ReduceMotion.System` already covers animations that are
 * *played* — a skeleton's pulse, a sheet sliding in. It does not cover a
 * style that is *derived* from a gesture, which is what the discovery arc is:
 * there is no animation to suppress, only a transform that follows the
 * finger. That still needs switching off, because the thing a vestibular
 * disorder reacts to is the movement on screen, not the API that produced it.
 *
 * So the arc reads this and lays its cards out flat instead. The row still
 * scrolls, still snaps and still says the same thing; it just stops rising
 * and falling under the thumb.
 *
 * The listener matters as much as the initial read — iOS and Android both let
 * the setting be changed while an app is open, and an app that only checks at
 * launch is an app that ignores the setting for the rest of the session.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let alive = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (alive) setReduce(enabled);
      })
      // Not every platform answers. Assuming "no" is the right default:
      // it is what the overwhelming majority of devices report, and the
      // alternative is flattening the arc for everybody.
      .catch(() => undefined);

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (alive) setReduce(enabled);
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
