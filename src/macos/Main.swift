import Cocoa

@main
enum Main {
    static func main() {
        let app = NSApplication.shared
        if let url = Bundle.main.url(forResource: "r2webui", withExtension: "icns"),
           let icon = NSImage(contentsOf: url) {
            app.applicationIconImage = icon
        }
        let delegate = AppDelegate()
        app.setActivationPolicy(.regular)
        app.delegate = delegate
        withExtendedLifetime(delegate) { app.run() }
    }
}
