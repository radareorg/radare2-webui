# Native radare2 web UI

Small native shells around the system web view. No Electron, Node runtime,
bundled browser engine, or linked radare2 library. An installed `r2` executable
does the analysis. Each tab gets its own process and OS-assigned loopback port.
Closing a tab stops and reaps its process; quitting stops every session.
Launching without file arguments opens an untitled session directly in the web
UI, where Tiles already provides file selection. File arguments still open the
requested binaries.

The content area contains the web UI, with native tabs and menus. On all platforms,
File → New Window creates an untitled r2 session, Open opens binaries in separate
windows, and Open in New Tab adds them to the active window.
View contains Reload, Open URL, Web UI selection
(Tiles, Material, Panels, Enyo), and default/light/dark themes. Theme colors apply
to Tiles; other frontends retain their own styling and receive `color-scheme`.
URL changes stay on the selected tab's local r2 server.
Dropping a local file into the window opens the native file picker at that
file's location. Confirming the picker opens the selected binaries in new tabs.

| Action | macOS | Linux / Windows |
| --- | --- | --- |
| New window with an untitled r2 session | Cmd+N | Ctrl+N |
| Open binaries in new windows | Cmd+O | Ctrl+O |
| Open binaries in tabs | Cmd+T | Ctrl+T |
| Close selected tab | Cmd+W | Ctrl+W |
| Select tab by position | Cmd+1 … Cmd+9 | Ctrl+1 … Ctrl+9 |
| Reload | Cmd+R | Ctrl+R / F5 |
| Toggle full screen | Cmd+F | Ctrl+F |
| Open URL dialog | Cmd+L | Ctrl+L |
| Quit all windows | Cmd+Q | Ctrl+Q |

Build and install on macOS or Linux from this directory:

```sh
make all
make user-install
r2wui /bin/ls
make user-uninstall
make clean
```

The Makefile selects the platform using `uname -s`. Installation puts the `r2wui`
launcher in `R2PM_BINDIR` (queried with `r2pm -H R2PM_BINDIR` when unset) and the
native app and web assets in `../share/r2wui` relative to that directory. Override
the destination with `make user-install BINDIR=/path/to/bin`; use the same
override to uninstall. Installed files remain usable after `make clean`.

## macOS

Requires macOS 11+ and the Xcode command line tools to build. Cocoa, WebKit and
the Swift runtime are system libraries. No Swift packages are downloaded.

```sh
make                   # chooses macOS or Linux automatically
make -C macos run FILE=/bin/ls
macos/build/r2webui.app/Contents/MacOS/r2webui /bin/ls /bin/cat
```

The application bundle is `macos/build/r2webui.app`. It can be moved elsewhere;
its web assets live in `Contents/Resources/webui`. `r2` must remain installed.
Finder launches also search Homebrew and `~/.local/bin` for r2.
The macOS title bar uses black for Tiles and white for Material, with native
control colors adjusted to match. Changing frontends updates the title bar.

```sh
make -C macos check       # real r2 processes, assets, commands, failure/cleanup
make -C macos check-ui    # opens WebKit; tests tabs, r2 output and theme changes
```

## Linux

Build with Vala, a C compiler, pkg-config and development packages for GTK4,
WebKitGTK 6.0, and libsoup 3.0. GTK4 and WebKitGTK are shared system libraries;
the executable does not need Vala at runtime.

```sh
# Debian/Ubuntu package names:
sudo apt install valac build-essential pkg-config libgtk-4-dev libwebkitgtk-6.0-dev libsoup-3.0-dev
make -C linux
linux/build/r2webui /bin/ls /bin/cat
make -C linux check
```

Distribute `linux/build/r2webui` with its adjacent `webui` directory. This uses
GTK4 APIs available since GTK 4.6, including dialogs deprecated in newer GTK
versions, to support older distributions too.

## Windows

Use Visual Studio's C++ tools with the MFC component and a Windows SDK. Extract
the official `Microsoft.Web.WebView2` NuGet package and point `WEBVIEW2_SDK` at
it. This is a build input; the app statically links only its small loader.

In an x64 Native Tools command prompt:

```bat
cd windows
set WEBVIEW2_SDK=C:\sdk\Microsoft.Web.WebView2
nmake
build\r2webui.exe C:\Windows\System32\notepad.exe
```

Use `nmake ARCH=arm64` or `ARCH=x86` with the matching MSVC tools for other
architectures. Distribute `build\r2webui.exe` and its `webui` directory. MFC and
the C/C++ runtime are dynamically linked to keep the executable small; the
matching Visual C++ Redistributable must be installed. The shared WebView2
Evergreen Runtime must also be present. It is normally included with Windows
11, but is not guaranteed on every Windows installation. The app reports a
missing runtime instead of downloading one. See Microsoft's
[runtime distribution guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)
and [single-executable loader guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/static).

Each r2 session belongs to a Windows job with `KILL_ON_JOB_CLOSE`, covering
normal closure and termination of the native host.

## Web assets and configuration

### App icons

The checked-in icons use the upstream radare logo on a white squircle. Regenerate
them from any SVG using Python 3 and ImageMagick 7 (build tools only):

```sh
make icons SVG=../../radare2/doc/images/r2.svg
# Or directly, with an optional output directory:
python3 scripts/generate-icons.py path/to/logo.svg --output assets/icons
```

Omitting the SVG argument uses `assets/radare.svg`, copied from radare2's
`shlr/www/r2.svg`. The script normalizes the old SVG namespace typo found in
some upstream copies, trims the canvas, makes the mark black, and centers it
without stretching it. It produces `assets/icons/r2webui.png` (1024 pixels),
PNGs at sizes 16–1024 in `assets/icons/png`, a Windows `.ico` containing seven
sizes, and a macOS `.icns` including Retina representations. No extra Python
packages or platform-specific icon tools are needed.

The macOS Makefile installs the `.icns` in the bundle; the Windows Makefile
compiles the `.ico` into the executable using the Windows SDK's resource
compiler. Ordinary app builds use these generated files directly, so they
do not require ImageMagick or Python.

### Frontend assets

The default Tiles UI is copied directly from `www/t` into each build's `webui/t`
directory: HTML, `js/t.js` + `js/tools.js` → `app.js`, and
`css/style.css` → `stylesheet.css`.
This build step uses no npm packages. Already-built Material, Panels and Enyo
frontends are also copied from the repository's `dist` or `dev` directories
when available. Build those frontends using the repository's existing build
instructions before rebuilding a native wrapper. Choosing an unavailable
frontend displays an installation error.

| Variable | Meaning |
| --- | --- |
| `R2` | Path to the r2 executable; default: search for `r2` in PATH |
| `R2_WEBUI_ROOT` | Absolute or relative directory containing `t/index.html`, etc. |
| `R2_WEBUI_UI` | Initial frontend directory name; default: `t` |

Without a root override, the host looks for its packaged `webui` directory,
then repository `dist`, `dev`, or `www` directories. A root override must contain
built assets, not just the source HTML that references generated filenames.

r2 is launched with argument arrays, without a shell, using `-N -q -c =h` so it
does not load user startup scripts or launch an external browser. HTTP listens
on loopback with CORS off and a same-origin Referer restriction. A unique value
in r2's internal key database identifies each session during readiness probes;
the host will not attach to another process that wins a port allocation race.
All hosts set `http.sandbox=false` before starting the HTTP server.
Startup has a 30-second timeout, and early process exits are reported natively.
The wrappers leave the file read-only at startup, following r2's default.

macOS builds and integration/UI tests can run on macOS. Linux needs its system
libraries to link and run, and Windows needs MSVC/MFC to build and run.
