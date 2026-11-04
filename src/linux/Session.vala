errordomain SessionError { CONFIG, STARTUP }

class Settings : Object {
    public string executable;
    public string? root;
    public string ui;

    public Settings () throws Error {
        string binary = Environment.get_variable ("R2") ?? "r2";
        executable = Environment.find_program_in_path (binary) ?? "";
        if (executable == "")
            throw new SessionError.CONFIG ("Cannot find radare2. Install r2 or set R2 to its executable path.");
        ui = Environment.get_variable ("R2_WEBUI_UI") ?? "t";
        if (ui == "" || !Regex.match_simple ("^[A-Za-z0-9_-]+$", ui))
            throw new SessionError.CONFIG ("R2_WEBUI_UI must be a UI directory name.");
        root = Environment.get_variable ("R2_WEBUI_ROOT");
        if (root != null) {
            root = Filename.canonicalize (root);
            if (!FileUtils.test (Path.build_filename (root, ui, "index.html"), FileTest.IS_REGULAR))
                throw new SessionError.CONFIG ("R2_WEBUI_ROOT must contain %s/index.html.", ui);
        } else {
            string executable_dir = Environment.get_current_dir ();
            try { executable_dir = Path.get_dirname (FileUtils.read_link ("/proc/self/exe")); } catch (Error e) { }
            foreach (string base_dir in new string[] { executable_dir, Environment.get_current_dir () }) {
                string directory = base_dir;
                for (int i = 0; i < 8 && root == null; i++) {
                    foreach (string name in new string[] { "webui", "dist", "dev", "www" }) {
                        string candidate = Path.build_filename (directory, name);
                        if (FileUtils.test (Path.build_filename (candidate, ui, "index.html"), FileTest.IS_REGULAR)) {
                            root = candidate;
                            break;
                        }
                    }
                    directory = Path.get_dirname (directory);
                }
                if (root != null) break;
            }
        }
    }
}

class R2Session : Object {
    public uint16 port { get; private set; }
    public bool exited { get; private set; default = false; }
    public signal void ready (string uri);
    public signal void failed (string message);
    private Subprocess? process;
    private Soup.Session client = new Soup.Session ();
    private Cancellable cancel = new Cancellable ();
    private uint timer;
    private bool stopped;
    private bool probing;
    private string? log_path;
    private string token = Uuid.string_random ();

    public void start (string file, Settings settings) throws Error {
        var reservation = new Socket (SocketFamily.IPV4, SocketType.STREAM, SocketProtocol.TCP);
        reservation.bind (new InetSocketAddress (new InetAddress.from_string ("127.0.0.1"), 0), false);
        port = (uint16) ((InetSocketAddress) reservation.get_local_address ()).port;
        string origin = "http://127.0.0.1:%u".printf (port);
        string[] args = { settings.executable, "-N", "-q", "-e", "scr.color=0", "-e", "http.sandbox=false",
            "-e", "http.bind=127.0.0.1", "-e", "http.port=%u".printf (port),
            "-e", "http.maxport=%u".printf (port), "-e", "http.cors=false",
            "-e", "http.referer=" + origin + "/", "-e", "http.ui=" + settings.ui };
        if (settings.root != null) {
            args += "-e"; args += "http.root=" + settings.root;
            args += "-e"; args += "http.homeroot=" + settings.root;
        }
        args += "-c"; args += "k r2webui.session=" + token;
        args += "-c"; args += "=h"; args += file;
        int fd = FileUtils.open_tmp ("r2webui-XXXXXX.log", out log_path);
        var launcher = new SubprocessLauncher (SubprocessFlags.NONE);
        int error_fd = Posix.dup (fd);
        if (error_fd < 0) { Posix.close (fd); throw new SessionError.STARTUP ("Cannot open radare2 log."); }
        launcher.take_stdout_fd (fd);
        launcher.take_stderr_fd (error_fd);
        reservation.close ();
        try { process = launcher.spawnv (args); }
        catch (Error e) { stop (); throw e; }
        watch.begin ();
        client.timeout = 1;
        client.proxy_resolver = new SimpleProxyResolver (null, null);
        int64 deadline = get_monotonic_time () + 30 * TimeSpan.SECOND;
        timer = Timeout.add (150, () => {
            if (stopped) { timer = 0; return Source.REMOVE; }
            if (get_monotonic_time () > deadline) {
                timer = 0;
                fail ("Timed out waiting for radare2.");
                return Source.REMOVE;
            }
            if (!probing) probe.begin (origin, settings.ui);
            return Source.CONTINUE;
        });
    }

    private async void watch () {
        try { yield process.wait_async (null); } catch (Error e) { }
        exited = true;
        if (!stopped) fail ("radare2 exited. See the server log below.");
    }

    private async void probe (string origin, string ui) {
        probing = true;
        var message = new Soup.Message ("GET", origin + "/cmd/k%20r2webui.session");
        message.request_headers.replace ("Referer", origin + "/");
        try {
            Bytes body = yield client.send_and_read_async (message, Priority.DEFAULT, cancel);
            // Bytes need not be NUL terminated.
            string text = ((string) body.get_data ()).substring (0, (long) body.get_size ());
            if (!stopped && !exited && message.status_code == 200 && text.strip () == token) {
                if (timer != 0) { Source.remove (timer); timer = 0; }
                ready (origin + "/" + ui + "/");
            }
        } catch (Error e) { /* The server may still be starting. */ }
        probing = false;
    }

    private void fail (string reason) {
        string details = "";
        if (log_path != null) {
            try { FileUtils.get_contents (log_path, out details); } catch (Error e) { }
        }
        stop ();
        failed (reason + "\n\n" + details);
    }

    public void stop () {
        if (stopped) return;
        stopped = true;
        if (timer != 0) { Source.remove (timer); timer = 0; }
        cancel.cancel ();
        client.abort ();
        if (process != null && !exited) {
            process.force_exit ();
            try { process.wait (null); } catch (Error e) { }
            exited = true;
        }
        if (log_path != null) FileUtils.unlink (log_path);
    }
}
