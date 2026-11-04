r2 tiles
========

A minimal, keyboard driven tiling frontend for radare2, in the spirit of dwm.

    make -C www/t build && r2 -e http.root=$PWD/dist -e http.ui=t -c=H /bin/ls

Panes are r2 commands. `$R` expands to the pane height in rows, and commands
without `@` use the pane's own address. Layout, pane addresses and command
history persist in localStorage. Click the circled **?** button, or press `?` or
`F1`, for the keys; `alt` is the window manager modifier.

Click **+ New frame**, press `o`, or press `Alt+P` to open a frame. Type any r2
command, such as `pd $R`, `px 256 @ main`, or `aflj`, then press Enter. Use the
arrow keys or click to choose a preset instead. Press `c` to edit the focused
frame's command.

The wheel and trackpad seek by instructions over disassembly and by data rows
over hex dumps, refreshing only that pane at its new address. Each pane has
independent navigation and seek undo/redo history. New panes inherit the focused
pane's address. Scrolling focuses the pane under the pointer. Lists, console
output, filtered results and commands with an explicit `@` use ordinary
scrolling. Horizontal scrolling and browser zoom gestures remain available.

Drag bytes in a hex dump or the instruction byte column to select a range.
Disassembly panes show instruction bytes using a temporary display setting.
Hex and ASCII highlights stay in sync. Shift-click extends the selection,
Cmd/Ctrl+C copies hex bytes, and Escape clears it. Drag past the top or bottom
edge to keep selecting as the pane scrolls. Each pane keeps its own selection.

Click the layout symbol to cycle tile, monocle and grid modes. Drag the gaps
between panels to resize columns or individual rows; sizes persist with the
layout.

    alt+j/k   focus        alt+enter  zoom        alt+p   new pane
    alt+h/l   master size  alt+t/m/g  layouts     alt+1-9 tags
    j/k       step / move  :          command     g       goto
    enter     follow       u/U        seek undo   /       filter

`e` opens the eval-variable picker from `ej`. Filter keys or values, press
Enter, edit `key=value`, and press Enter to apply. Values are read back from r2.

`|` splits the focused frame side by side; `-` splits it top and bottom. The
new frame inherits its command and address. Splits can be nested and resized.
The title's `↻` button cycles print modes; Shift-click cycles backwards.
The `⇄` button links or unlinks a frame's seek. Linked frames follow seeks
from any frame; unlinked frames keep independent offsets.

`y` yanks the byte selection, or one byte without a selection, into r2's yank
buffer. `Y` pastes that buffer at the byte cursor. `m` followed by a key sets
a native visual mark; `'` followed by its key seeks to it.

The decompiler preset is `pdco`, with offsets beside code. Its selectors list
the backends reported by `e cmd.pdc=?` and their options, using the same config
prefixes as iaito. Decompiler choices are independent for each frame.

**Projects** lists binary projects in a filterable HTML dialog. Select a file
and open it, or save the session to a `.r2prj` file. This uses `prj open` and
`prj save`, with no legacy script-project fallback. Notes, frame layout,
addresses, seek links, decompiler choices and visual marks travel inside the
binary project. Custom commands loaded from a project require review before
execution. **Notes** (or `N`) opens the notes editor; drafts are kept locally,
and **Save notes and project** persists them in the binary project file.

**Open file** (or `O`) accepts a local path and lists opened files from `oj`.
It checks the new file, then uses `o--` to close the previous files and clear
their flags and analysis before opening a fresh session. A failed initial open
preserves the existing files.

**r2pm** searches package names and descriptions, filters installed packages,
and provides install, uninstall and database-update actions with command output
and failures. Newly installed native plugins may require restarting r2.

r2's default HTTP sandbox blocks opening arbitrary local files, running r2pm
and some binary-project operations. The UI reports these backend errors instead
of pretending the command succeeded. For a trusted local desktop session with
these features enabled, start a loopback-only server explicitly:

    r2 -e http.bind=127.0.0.1 -e http.sandbox=false -e http.root=$PWD/dist -e http.ui=t -c=H /bin/ls

HTTP sandbox permissions are fixed when the server starts; a browser command
cannot change them.

Run `npm test` in `www/t` for the interaction tests. `npm run test:integration`
starts temporary loopback r2 servers to check file replacement, binary project
round trips and r2pm output; it requires a local r2 with binary-project support.
