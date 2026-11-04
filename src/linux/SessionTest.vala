int main () {
    try {
        var settings = new Settings ();
        var first = new R2Session ();
        var second = new R2Session ();
        var loop = new MainLoop ();
        int ready = 0;
        bool failed = false;
        first.ready.connect (() => { if (++ready == 2) loop.quit (); });
        second.ready.connect (() => { if (++ready == 2) loop.quit (); });
        first.failed.connect ((message) => { stderr.printf ("%s\n", message); failed = true; loop.quit (); });
        second.failed.connect ((message) => { stderr.printf ("%s\n", message); failed = true; loop.quit (); });
        first.start ("/bin/ls", settings);
        second.start ("/bin/ls", settings);
        loop.run ();
        bool valid = !failed && ready == 2 && first.port != second.port;
        first.stop ();
        valid = valid && first.exited && !second.exited;
        second.stop ();
        if (!valid) return 1;
        print ("PASS: two ports, authenticated readiness, independent shutdown\n");
        return 0;
    } catch (Error e) { stderr.printf ("%s\n", e.message); return 1; }
}
