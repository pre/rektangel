# TypeScript core that runs in-process on GNOME and KDE

On Wayland, only the compositor process can move the windows of other applications and grab global keys, and Mutter has no protocol or D-Bus method that moves windows. The only supported way to run code in gnome-shell is a Shell extension in JavaScript, and KWin scripts are JavaScript in QJSEngine. We write the core in TypeScript, so that the same bundle runs in-process in GJS and in QJSEngine with no glue code and no extra process.

## Considered Options

- Rust compiled to WebAssembly: QJSEngine in KWin has no WebAssembly, so KDE would need a daemon.
- Rust as a GObject typelib loaded by GJS: a panic stops the whole session, and there is no mature GIR generator for Rust.
- Rust daemon over D-Bus: two processes, and an asynchronous hop on each key press.
