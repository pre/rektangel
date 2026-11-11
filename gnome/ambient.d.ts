import '@girs/gjs';
import '@girs/gjs/dom';
import '@girs/gnome-shell/ambient';
import '@girs/gnome-shell/extensions/global';

declare module '@girs/gnome-shell/ui/windowManager' {
  interface WindowManager {
    /** The next minimize, unminimize or other effect of the window actor has no animation. */
    skipNextEffect(actor: import('gi://Meta').default.WindowActor): void;
  }
}
