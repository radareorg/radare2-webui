r2 tiles
========

A minimal, keyboard driven tiling frontend for radare2, in the spirit of dwm.

    make -C www/t build && r2 -e http.root=$PWD/dist -e http.ui=t -c=H /bin/ls

Panes are r2 commands. `$R` expands to the pane height in rows, and commands
without `@` follow the current seek. Layout, panes and command history persist
in localStorage. Press `?` for the keys; `alt` is the window manager modifier.

    alt+j/k   focus        alt+enter  zoom        alt+p   new pane
    alt+h/l   master size  alt+t/m/g  layouts     alt+1-9 tags
    j/k       step / move  :          command     g       goto
    enter     follow       u/U        seek undo   /       filter
