import Cocoa
import WebKit

final class FileDropWebView: WKWebView {
    var onFileDrop: ((URL) -> Void)?

    private func fileURL(from sender: NSDraggingInfo) -> URL? {
        (sender.draggingPasteboard.readObjects(forClasses: [NSURL.self],
            options: [.urlReadingFileURLsOnly: true]) as? [URL])?.first
    }
    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
        fileURL(from: sender) == nil ? super.draggingEntered(sender) : .copy
    }
    override func draggingUpdated(_ sender: NSDraggingInfo) -> NSDragOperation {
        fileURL(from: sender) == nil ? super.draggingUpdated(sender) : .copy
    }
    override func prepareForDragOperation(_ sender: NSDraggingInfo) -> Bool {
        fileURL(from: sender) != nil || super.prepareForDragOperation(sender)
    }
    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        guard let url = fileURL(from: sender) else { return super.performDragOperation(sender) }
        DispatchQueue.main.async { [weak self] in self?.onFileDrop?(url) }
        return true
    }
}

final class BrowserWindow: NSWindowController, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate {
    private let session = R2Session()
    let web: FileDropWebView = {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        return FileDropWebView(frame: .zero, configuration: configuration)
    }()
    private let settings: Settings
    private var theme = "default"
    var onClose: (() -> Void)?

    init(file: String, settings: Settings) throws {
        self.settings = settings
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1200, height: 800),
                              styleMask: [.titled, .closable, .miniaturizable, .resizable],
                              backing: .buffered, defer: false)
        super.init(window: window)
        window.title = "\(file == "-" ? "Untitled" : (file as NSString).lastPathComponent) — radare2"
        window.delegate = self
        window.center()
        window.isReleasedWhenClosed = false
        window.tabbingIdentifier = "org.radare.r2webui"
        window.tabbingMode = .automatic
        window.collectionBehavior.insert(.fullScreenPrimary)
        updateTitlebar(for: settings.ui)
        window.contentView = web
        web.registerForDraggedTypes([.fileURL])
        web.onFileDrop = { [weak window] url in
            (NSApp.delegate as? AppDelegate)?.showOpenDialog(initialURL: url, parent: window)
        }
        web.navigationDelegate = self
        web.uiDelegate = self
        session.onReady = { [weak self] url in
            self?.web.load(URLRequest(url: url))
        }
        session.onFailure = { [weak self] message in
            guard let window = self?.window else { return }
            let alert = NSAlert()
            alert.messageText = "radare2 failed"
            alert.informativeText = message
            alert.beginSheetModal(for: window)
        }
        try session.start(file: file, settings: settings)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    func reloadPage() { web.reload() }
    func changeURL() {
        let alert = NSAlert()
        alert.messageText = "Open URL"
        alert.informativeText = "Enter a URL on this tab’s radare2 server."
        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 480, height: 24))
        input.stringValue = web.url?.absoluteString ?? "http://127.0.0.1:\(session.port)/"
        alert.accessoryView = input
        alert.addButton(withTitle: "Open"); alert.addButton(withTitle: "Cancel")
        alert.beginSheetModal(for: window!) { [weak self] response in
            guard response == .alertFirstButtonReturn, let self = self,
                  let url = URL(string: input.stringValue), url.scheme == "http",
                  url.host == "127.0.0.1", url.port == Int(self.session.port) else { return }
            self.web.load(URLRequest(url: url))
        }
    }
    func changeUI(_ ui: String) {
        if let root = settings.root, !FileManager.default.fileExists(atPath: root + "/" + ui + "/index.html") {
            let alert = NSAlert()
            alert.messageText = "Web UI is not installed"
            alert.informativeText = "Build the \(ui) web UI and rebuild this app, or set R2_WEBUI_ROOT to a directory containing it."
            alert.beginSheetModal(for: window!)
            return
        }
        updateTitlebar(for: ui)
        web.load(URLRequest(url: URL(string: "http://127.0.0.1:\(session.port)/\(ui)/")!))
    }
    private func updateTitlebar(for ui: String) {
        let dark = ui == "t"
        window?.titlebarAppearsTransparent = true
        window?.backgroundColor = dark ? .black : .white
        window?.appearance = NSAppearance(named: dark ? .darkAqua : .aqua)
    }
    func changeTheme(_ theme: String) {
        self.theme = theme
        applyTheme()
    }
    private func applyTheme() {
        let colors = theme == "light" ? ["#f4f5f7", "#fff", "#20242b", "#687180", "#dce4ed", "#c6cbd3"]
            : ["#0d0f12", "#15181d", "#c9d1d9", "#5c6370", "#2a2f38", "#262a31"]
        let css = theme == "default" ? "" : ":root{color-scheme:\(theme);" + zip(["bg", "pane", "fg", "dim", "sel", "bd"], colors)
            .map { "--\($0):\($1)!important;" }.joined() + "}"
        let literal = String(data: try! JSONSerialization.data(withJSONObject: css, options: [.fragmentsAllowed]), encoding: .utf8)!
        web.evaluateJavaScript("var s=document.getElementById('r2-native-theme');if(!s){s=document.createElement('style');s.id='r2-native-theme';document.head.appendChild(s)}s.textContent=\(literal)")
    }
    func windowWillClose(_ notification: Notification) { session.stop(); onClose?() }
    func stop() { session.stop() }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        let ui = webView.url?.path.split(separator: "/").first.map(String.init) ?? settings.ui
        updateTitlebar(for: ui)
        applyTheme()
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        guard (error as NSError).code != NSURLErrorCancelled else { return }
        let alert = NSAlert(error: error); alert.beginSheetModal(for: window!)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let url = navigationAction.request.url
        let local = url?.scheme == "http" && url?.host == "127.0.0.1" && url?.port == Int(session.port)
        decisionHandler(local || url?.absoluteString == "about:blank" ? .allow : .cancel)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert(); alert.messageText = message
        alert.beginSheetModal(for: window!) { _ in completionHandler() }
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert(); alert.messageText = message
        alert.addButton(withTitle: "OK"); alert.addButton(withTitle: "Cancel")
        alert.beginSheetModal(for: window!) { completionHandler($0 == .alertFirstButtonReturn) }
    }
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert(); alert.messageText = prompt
        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 360, height: 24))
        input.stringValue = defaultText ?? ""
        alert.accessoryView = input
        alert.addButton(withTitle: "OK"); alert.addButton(withTitle: "Cancel")
        alert.beginSheetModal(for: window!) { completionHandler($0 == .alertFirstButtonReturn ? input.stringValue : nil) }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var windows: [BrowserWindow] = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Quit radare2", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        let appItem = NSMenuItem(); appItem.submenu = appMenu; menu.addItem(appItem)
        let fileMenu = NSMenu(title: "File")
        fileMenu.addItem(withTitle: "New Window", action: #selector(newWindow(_:)), keyEquivalent: "n")
        fileMenu.addItem(withTitle: "Open…", action: #selector(openFile(_:)), keyEquivalent: "o")
        fileMenu.addItem(withTitle: "Open in New Tab…", action: #selector(openInTab(_:)), keyEquivalent: "t")
        fileMenu.addItem(withTitle: "Close Tab", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        let fileItem = NSMenuItem(); fileItem.submenu = fileMenu; menu.addItem(fileItem)
        let editMenu = NSMenu(title: "Edit")
        for (title, action, key) in [("Undo", "undo:", "z"), ("Cut", "cut:", "x"),
                                     ("Copy", "copy:", "c"), ("Paste", "paste:", "v"), ("Select All", "selectAll:", "a")] {
            editMenu.addItem(withTitle: title, action: Selector(action), keyEquivalent: key)
        }
        let editItem = NSMenuItem(); editItem.submenu = editMenu; menu.addItem(editItem)
        let viewMenu = NSMenu(title: "View")
        viewMenu.addItem(withTitle: "Reload", action: #selector(reloadPage), keyEquivalent: "r")
        viewMenu.addItem(withTitle: "Open URL…", action: #selector(changeURL), keyEquivalent: "l")
        viewMenu.addItem(withTitle: "Toggle Full Screen", action: #selector(toggleFullScreen), keyEquivalent: "f")
        let uiMenu = NSMenu(title: "Web UI")
        for (label, ui) in [("Tiles", "t"), ("Material", "m"), ("Panels", "p"), ("Enyo", "enyo")] {
            let item = uiMenu.addItem(withTitle: label, action: #selector(changeUI(_:)), keyEquivalent: "")
            item.representedObject = ui
        }
        let uiItem = NSMenuItem(title: "Web UI", action: nil, keyEquivalent: ""); uiItem.submenu = uiMenu; viewMenu.addItem(uiItem)
        let themeMenu = NSMenu(title: "Theme")
        for (label, theme) in [("Web UI Default", "default"), ("Light", "light"), ("Dark", "dark")] {
            let item = themeMenu.addItem(withTitle: label, action: #selector(changeTheme(_:)), keyEquivalent: "")
            item.representedObject = theme
        }
        let themeItem = NSMenuItem(title: "Theme", action: nil, keyEquivalent: ""); themeItem.submenu = themeMenu; viewMenu.addItem(themeItem)
        let viewItem = NSMenuItem(); viewItem.submenu = viewMenu; menu.addItem(viewItem)
        let windowMenu = NSMenu(title: "Window")
        for number in 1...9 {
            let item = windowMenu.addItem(withTitle: "Select Tab \(number)", action: #selector(selectTab(_:)), keyEquivalent: String(number))
            item.keyEquivalentModifierMask = [.command]
            item.tag = number - 1
            item.target = self
        }
        let windowItem = NSMenuItem(); windowItem.submenu = windowMenu; menu.addItem(windowItem)
        NSApp.mainMenu = menu
        NSWindow.allowsAutomaticWindowTabbing = false
        NSApp.activate(ignoringOtherApps: true)
        let files = CommandLine.arguments.dropFirst().filter { !$0.hasPrefix("-psn_") }
        if files.isEmpty { newWindow(nil) } else {
            files.forEach { open($0, inTabOf: selected?.window) }
        }
    }

    @objc func newWindow(_ sender: Any?) { open(nil) }

    @objc func openFile(_ sender: Any?) {
        showOpenDialog(parent: selected?.window, openInTab: false)
    }

    @objc func openInTab(_ sender: Any?) {
        showOpenDialog(parent: selected?.window)
    }

    func showOpenDialog(initialURL: URL? = nil, parent: NSWindow?, openInTab: Bool = true) {
        guard parent?.attachedSheet == nil else { return }
        let panel = NSOpenPanel()
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = true
        if let url = initialURL {
            let isDirectory = (try? url.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory == true
            panel.directoryURL = isDirectory ? url : url.deletingLastPathComponent()
            if !isDirectory { panel.nameFieldStringValue = url.lastPathComponent }
        }
        let openSelection: () -> Void = { [weak self] in
            guard let self = self else { return }
            var target = parent
            for url in panel.urls {
                self.open(url.path, inTabOf: openInTab ? target : nil)
                if openInTab && target == nil { target = self.selected?.window }
            }
        }
        if let parent = parent {
            parent.makeKeyAndOrderFront(nil)
            panel.beginSheetModal(for: parent) { response in
                if response == .OK { openSelection() }
            }
        } else if panel.runModal() == .OK {
            openSelection()
        }
    }

    private var selected: BrowserWindow? {
        windows.first { $0.window === NSApp.keyWindow } ?? windows.last
    }
    @objc func reloadPage() { selected?.reloadPage() }
    @objc func toggleFullScreen() {
        guard let window = selected?.window, window.attachedSheet == nil else { return }
        window.toggleFullScreen(nil)
    }
    @objc func selectTab(_ sender: NSMenuItem) {
        guard let window = selected?.window, window.attachedSheet == nil else { return }
        let tabs = window.tabbedWindows ?? [window]
        guard tabs.indices.contains(sender.tag) else { return }
        window.tabGroup?.selectedWindow = tabs[sender.tag]
        tabs[sender.tag].makeKeyAndOrderFront(nil)
    }
    @objc func changeURL() { selected?.changeURL() }
    @objc func changeUI(_ sender: NSMenuItem) { if let ui = sender.representedObject as? String { selected?.changeUI(ui) } }
    @objc func changeTheme(_ sender: NSMenuItem) { if let theme = sender.representedObject as? String { selected?.changeTheme(theme) } }

    private func open(_ path: String?, inTabOf parent: NSWindow? = nil) {
        do {
            let file = path.map { URL(fileURLWithPath: $0).standardizedFileURL.path } ?? "-"
            let previous = selected?.window
            let controller = try BrowserWindow(file: file, settings: Settings())
            controller.onClose = { [weak self, weak controller] in self?.windows.removeAll { $0 === controller } }
            windows.append(controller)
            if let parent = parent, windows.contains(where: { $0.window === parent }) {
                parent.addTabbedWindow(controller.window!, ordered: .above)
            } else if let previous = previous {
                controller.window?.setFrameTopLeftPoint(NSPoint(x: previous.frame.minX + 24, y: previous.frame.maxY - 24))
            }
            controller.showWindow(nil)
        } catch {
            let alert = NSAlert(error: error); alert.runModal()
        }
    }
    func application(_ sender: NSApplication, openFiles filenames: [String]) {
        filenames.forEach { open($0, inTabOf: selected?.window) }; sender.reply(toOpenOrPrint: .success)
    }
    func applicationWillTerminate(_ notification: Notification) { windows.forEach { $0.stop() } }
}
