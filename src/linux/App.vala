class BrowserTab : Gtk.Box {
    private R2Session session = new R2Session ();
    private WebKit.WebView web = new WebKit.WebView ();
    private Settings settings;
    private string theme = "default";
    private ulong ready_handler;
    private ulong failure_handler;
    private ulong policy_handler;
    private ulong load_handler;

    public BrowserTab (App app, Gtk.Window parent, string path, Settings settings) throws Error {
        Object (orientation: Gtk.Orientation.VERTICAL, spacing: 0);
        this.settings = settings;
        web.vexpand = true;
        append (web);
        ready_handler = session.ready.connect ((uri) => {
            web.load_uri (uri);
        });
        failure_handler = session.failed.connect ((message) => {
            app.show_error (parent, message);
        });
        policy_handler = web.decide_policy.connect ((decision, type) => {
            if (type == WebKit.PolicyDecisionType.NAVIGATION_ACTION || type == WebKit.PolicyDecisionType.NEW_WINDOW_ACTION) {
                var navigation = (WebKit.NavigationPolicyDecision) decision;
                string uri = navigation.get_navigation_action ().get_request ().get_uri ();
                string origin = "http://127.0.0.1:%u/".printf (session.port);
                if (!uri.has_prefix (origin) && uri != "about:blank") { decision.ignore (); return true; }
            }
            return false;
        });
        load_handler = web.load_changed.connect ((event) => { if (event == WebKit.LoadEvent.FINISHED) apply_theme (); });
        try { session.start (path, settings); } catch (Error e) { stop (); throw e; }
    }
    public void stop () {
        if (ready_handler != 0) { session.disconnect (ready_handler); ready_handler = 0; }
        if (failure_handler != 0) { session.disconnect (failure_handler); failure_handler = 0; }
        if (policy_handler != 0) { web.disconnect (policy_handler); policy_handler = 0; }
        if (load_handler != 0) { web.disconnect (load_handler); load_handler = 0; }
        web.stop_loading ();
        session.stop ();
    }
    public void reload () { web.reload (); }
    public void change_url (Gtk.Window parent) {
        var dialog = new Gtk.Dialog.with_buttons ("Open URL", parent, Gtk.DialogFlags.MODAL,
            "Cancel", Gtk.ResponseType.CANCEL, "Open", Gtk.ResponseType.ACCEPT);
        var entry = new Gtk.Entry ();
        entry.width_chars = 64;
        entry.text = web.get_uri () ?? "http://127.0.0.1:%u/".printf (session.port);
        entry.activates_default = true;
        dialog.set_default_response (Gtk.ResponseType.ACCEPT);
        dialog.get_content_area ().append (entry);
        dialog.response.connect ((response) => {
            if (response == Gtk.ResponseType.ACCEPT && entry.text.has_prefix ("http://127.0.0.1:%u/".printf (session.port)))
                web.load_uri (entry.text);
            dialog.destroy ();
        });
        dialog.present ();
    }
    public void change_ui (string ui, App app, Gtk.Window parent) {
        if (settings.root != null && !FileUtils.test (Path.build_filename (settings.root, ui, "index.html"), FileTest.IS_REGULAR)) {
            app.show_error (parent, "Build the %s web UI and rebuild this app, or set R2_WEBUI_ROOT to a directory containing it.".printf (ui));
            return;
        }
        web.load_uri ("http://127.0.0.1:%u/%s/".printf (session.port, ui));
    }
    public void change_theme (string name) { theme = name; apply_theme (); }
    private void apply_theme () {
        string css = "";
        if (theme == "light") css = ":root{color-scheme:light;--bg:#f4f5f7!important;--pane:#fff!important;--fg:#20242b!important;--dim:#687180!important;--sel:#dce4ed!important;--bd:#c6cbd3!important}";
        if (theme == "dark") css = ":root{color-scheme:dark;--bg:#0d0f12!important;--pane:#15181d!important;--fg:#c9d1d9!important;--dim:#5c6370!important;--sel:#2a2f38!important;--bd:#262a31!important}";
        string script = "var s=document.getElementById('r2-native-theme');if(!s){s=document.createElement('style');s.id='r2-native-theme';document.head.appendChild(s)}s.textContent='" + css + "'";
        web.evaluate_javascript.begin (script, -1, null, null, null, (obj, res) => {
            try { web.evaluate_javascript.end (res); } catch (Error e) { }
        });
    }
}

class BrowserWindow : Gtk.ApplicationWindow {
    private Gtk.Notebook tabs = new Gtk.Notebook ();
    public bool closed { get; private set; }

    public BrowserWindow (App app) {
        Object (application: app, title: "radare2", default_width: 1200, default_height: 800);
        tabs.scrollable = true;
        tabs.hexpand = tabs.vexpand = true;
        var content = new Gtk.Box (Gtk.Orientation.VERTICAL, 0);
        content.append (new Gtk.PopoverMenuBar.from_model (app.menubar));
        content.append (tabs);
        set_child (content);
        var drop = new Gtk.DropTarget (typeof (Gdk.FileList), Gdk.DragAction.COPY);
        drop.propagation_phase = Gtk.PropagationPhase.CAPTURE;
        drop.drop.connect ((value, x, y) => {
            var files = (Gdk.FileList) value.get_boxed ();
            foreach (var file in files.get_files ()) {
                if (file.get_path () == null) continue;
                Idle.add (() => { app.choose (this, file); return Source.REMOVE; });
                return true;
            }
            return false;
        });
        ((Gtk.Widget) this).add_controller (drop);
        close_request.connect (() => { stop (); return false; });
    }
    public void open_file (string path, Settings settings) throws Error {
        var tab = new BrowserTab ((App) application, this, path, settings);
        var label = new Gtk.Box (Gtk.Orientation.HORIZONTAL, 6);
        label.append (new Gtk.Label (path == "-" ? "Untitled" : Path.get_basename (path)));
        var close = new Gtk.Button.from_icon_name ("window-close-symbolic");
        close.has_frame = false;
        close.tooltip_text = "Close tab";
        close.clicked.connect (() => close_tab (tab));
        label.append (close);
        int page = tabs.append_page (tab, label);
        tabs.set_tab_reorderable (tab, true);
        tabs.set_current_page (page);
    }
    private void close_tab (BrowserTab tab) {
        tab.stop ();
        tabs.remove_page (tabs.page_num (tab));
        if (tabs.get_n_pages () == 0) { closed = true; destroy (); }
    }
    public void close_current () {
        var tab = tabs.get_nth_page (tabs.get_current_page ()) as BrowserTab;
        if (tab != null) close_tab (tab);
    }
    public BrowserTab? current_tab () { return tabs.get_nth_page (tabs.get_current_page ()) as BrowserTab; }
    public void select_tab (int index) {
        if (index >= 0 && index < tabs.get_n_pages ()) tabs.set_current_page (index);
    }
    public void toggle_fullscreen () {
        if (is_fullscreen ()) unfullscreen ();
        else fullscreen ();
    }
    public void stop () {
        closed = true;
        for (int i = 0; i < tabs.get_n_pages (); i++) ((BrowserTab) tabs.get_nth_page (i)).stop ();
    }
}

class App : Gtk.Application {
    private weak BrowserWindow? last_window;
    public App () { Object (application_id: "org.radare.r2webui", flags: ApplicationFlags.HANDLES_OPEN); }
    protected override void startup () {
        base.startup ();
        var new_action = new SimpleAction ("new", null);
        new_action.activate.connect (() => open_path (null));
        add_action (new_action);
        set_accels_for_action ("app.new", { "<Primary>n" });
        var open_action = new SimpleAction ("open", null);
        open_action.activate.connect (() => choose (active_window, null, false));
        add_action (open_action);
        set_accels_for_action ("app.open", { "<Primary>o" });
        var tab_action = new SimpleAction ("open-tab", null);
        tab_action.activate.connect (() => choose (active_window));
        add_action (tab_action);
        set_accels_for_action ("app.open-tab", { "<Primary>t" });
        var close_action = new SimpleAction ("close", null);
        close_action.activate.connect (() => {
            var window = active_window as BrowserWindow;
            if (window != null) window.close_current ();
        });
        add_action (close_action);
        set_accels_for_action ("app.close", { "<Primary>w" });
        var quit_action = new SimpleAction ("quit", null);
        quit_action.activate.connect (() => quit ());
        add_action (quit_action);
        set_accels_for_action ("app.quit", { "<Primary>q" });
        var reload_action = new SimpleAction ("reload", null);
        reload_action.activate.connect (() => selected ()?.reload ());
        add_action (reload_action);
        set_accels_for_action ("app.reload", { "<Primary>r", "F5" });
        var fullscreen_action = new SimpleAction ("fullscreen", null);
        fullscreen_action.activate.connect (() => (active_window as BrowserWindow)?.toggle_fullscreen ());
        add_action (fullscreen_action);
        set_accels_for_action ("app.fullscreen", { "<Primary>f" });
        var url_action = new SimpleAction ("url", null);
        url_action.activate.connect (() => { if (active_window != null) selected ()?.change_url (active_window); });
        add_action (url_action);
        set_accels_for_action ("app.url", { "<Primary>l" });
        var ui_action = new SimpleAction ("ui", VariantType.STRING);
        ui_action.activate.connect ((value) => { if (active_window != null) selected ()?.change_ui (value.get_string (), this, active_window); });
        add_action (ui_action);
        var theme_action = new SimpleAction ("theme", VariantType.STRING);
        theme_action.activate.connect ((value) => selected ()?.change_theme (value.get_string ()));
        add_action (theme_action);
        var menu = new Menu ();
        var file_menu = new Menu ();
        file_menu.append ("New Window", "app.new");
        file_menu.append ("Open…", "app.open");
        file_menu.append ("Open in New Tab…", "app.open-tab");
        file_menu.append ("Close Tab", "app.close");
        file_menu.append ("Quit", "app.quit");
        menu.append_submenu ("File", file_menu);
        var view_menu = new Menu ();
        view_menu.append ("Reload", "app.reload");
        view_menu.append ("Open URL…", "app.url");
        view_menu.append ("Toggle Full Screen", "app.fullscreen");
        var ui_menu = new Menu ();
        ui_menu.append ("Tiles", "app.ui::t"); ui_menu.append ("Material", "app.ui::m");
        ui_menu.append ("Panels", "app.ui::p"); ui_menu.append ("Enyo", "app.ui::enyo");
        view_menu.append_submenu ("Web UI", ui_menu);
        var theme_menu = new Menu ();
        theme_menu.append ("Web UI Default", "app.theme::default");
        theme_menu.append ("Light", "app.theme::light"); theme_menu.append ("Dark", "app.theme::dark");
        view_menu.append_submenu ("Theme", theme_menu);
        menu.append_submenu ("View", view_menu);
        var select_action = new SimpleAction ("tab", VariantType.INT32);
        select_action.activate.connect ((value) => {
            var window = active_window as BrowserWindow;
            if (window != null) window.select_tab (value.get_int32 ());
        });
        add_action (select_action);
        var window_menu = new Menu ();
        for (int i = 0; i < 9; i++) {
            string action = "app.tab(%d)".printf (i);
            window_menu.append ("Select Tab %d".printf (i + 1), action);
            set_accels_for_action (action, { "<Primary>%d".printf (i + 1) });
        }
        menu.append_submenu ("Window", window_menu);
        menubar = menu;
    }
    private BrowserTab? selected () { return (active_window as BrowserWindow)?.current_tab (); }
    protected override void activate () { open_path (null); }
    protected override void shutdown () {
        foreach (var window in get_windows ()) {
            var browser = window as BrowserWindow;
            if (browser != null) browser.stop ();
        }
        base.shutdown ();
    }
    protected override void open (File[] files, string hint) {
        BrowserWindow? target = active_window as BrowserWindow ?? last_window;
        foreach (var file in files) {
            string? path = file.get_path ();
            if (path != null) {
                var opened = open_path (path, target);
                if (opened != null) target = opened;
            }
            else show_error (active_window, "Choose a local file.");
        }
    }
    private BrowserWindow? open_path (string? path, BrowserWindow? target = null) {
        BrowserWindow? window = target;
        if (window != null && window.closed) window = null;
        bool created = window == null;
        try {
            var settings = new Settings ();
            if (window == null) window = new BrowserWindow (this);
            window.open_file (path == null ? "-" : Filename.canonicalize (path), settings);
            last_window = window;
            window.present ();
            return window;
        } catch (Error e) {
            if (created && window != null) window.destroy ();
            show_error (active_window, e.message);
            return null;
        }
    }
    public void choose (Gtk.Window? parent, File? initial_file = null, bool open_in_tab = true) {
        hold ();
        var chooser = new Gtk.FileChooserNative ("Open in radare2", parent, Gtk.FileChooserAction.OPEN, "Open", "Cancel");
        chooser.select_multiple = true;
        chooser.modal = true;
        if (initial_file != null) {
            try {
                if (initial_file.query_file_type (FileQueryInfoFlags.NONE) == FileType.DIRECTORY)
                    chooser.set_current_folder (initial_file);
                else chooser.set_file (initial_file);
            } catch (Error e) { /* Still show the picker if the dropped path disappeared. */ }
        }
        chooser.response.connect ((response) => {
            if (response == Gtk.ResponseType.ACCEPT) {
                BrowserWindow? target = open_in_tab ? parent as BrowserWindow : null;
                var files = chooser.get_files ();
                for (uint i = 0; i < files.get_n_items (); i++) {
                    string? path = ((File) files.get_item (i)).get_path ();
                    if (path != null) {
                        var opened = open_path (path, target);
                        if (open_in_tab && opened != null) target = opened;
                    }
                }
            }
            chooser.destroy ();
            release ();
        });
        chooser.show ();
    }
    public void show_error (Gtk.Window? parent, string text) {
        hold ();
        var dialog = new Gtk.MessageDialog (parent, Gtk.DialogFlags.MODAL, Gtk.MessageType.ERROR, Gtk.ButtonsType.CLOSE, "%s", text);
        dialog.response.connect (() => { dialog.destroy (); release (); });
        dialog.present ();
    }
    public static int main (string[] args) { return new App ().run (args); }
}
