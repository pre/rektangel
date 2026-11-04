// Run with: gjs -m test/prefs-launcher.js <dist dir>
// prefs-dev.sh starts it. Opens dist/prefs.js in a window as the GNOME
// Extensions prefs process does, so a change shows without a logout.
// getSettings() reads the schema from metadata.dir/schemas, so the dist
// schema is used, not the installed one. The settings backend is the one
// in the environment: the real dconf, or a keyfile with --sandbox.
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const [distArg] = ARGV;
if (!distArg) {
  throw new Error('Usage: gjs -m test/prefs-launcher.js <dist dir>');
}
const dist = Gio.File.new_for_path(distArg);
const distPath = dist.get_path();

Gio.Resource.load('/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource')._register();
const [, bytes] = GLib.file_get_contents(`${distPath}/metadata.json`);
const metadata = JSON.parse(new TextDecoder().decode(bytes));
metadata.dir = dist;
metadata.path = distPath;
const { default: Prefs } = await import(`${dist.get_uri()}/prefs.js`);

GLib.set_prgname('Rektangel');
GLib.set_application_name('Rektangel');
const app = new Adw.Application({ flags: Gio.ApplicationFlags.NON_UNIQUE });
app.connect('activate', () => {
  const win = new Adw.PreferencesWindow({ application: app, default_width: 640, default_height: 900, title: 'Rektangel' });
  new Prefs(metadata).fillPreferencesWindow(win);
  win.present();
});
await app.runAsync([]);
