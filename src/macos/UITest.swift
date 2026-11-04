import Cocoa
import WebKit

final class UITestDelegate: NSObject, NSApplicationDelegate {
    var windows: [BrowserWindow] = []
    var timer: Timer?
    var deadline = Date().addingTimeInterval(35)
    var checking = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            NSWindow.allowsAutomaticWindowTabbing = false
            let settings = try Settings()
            for file in ["/bin/ls", "/bin/cat"] {
                windows.append(try BrowserWindow(file: file, settings: settings))
            }
            windows[0].window!.addTabbedWindow(windows[1].window!, ordered: .above)
            windows[1].showWindow(nil)
            timer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { [weak self] _ in self?.check() }
        } catch { finish(error.localizedDescription) }
    }

    func check() {
        if Date() > deadline { finish("WebKit did not render both tabs"); return }
        guard !checking else { return }
        checking = true
        var remaining = windows.count
        var rendered = 0
        for controller in windows {
            controller.web.evaluateJavaScript("document.querySelectorAll('#wm > *').length >= 3 && document.getElementById('wm').textContent.includes('0x')") { value, _ in
                if value as? Bool == true { rendered += 1 }
                remaining -= 1
                if remaining == 0 {
                    self.checking = false
                    if rendered == 2 {
                        let tabs = self.windows[0].window!.tabbedWindows?.count ?? 0
                        let hasSize = self.windows.allSatisfy {
                            $0.web.frame.width > 500 && $0.web.frame.height > 300 && $0.window?.contentView === $0.web
                        }
                        guard tabs == 2 && hasSize else { self.finish("Native tabs or WebKit geometry failed"); return }
                        self.timer?.invalidate()
                        self.windows[0].changeTheme("light")
                        self.windows[0].web.evaluateJavaScript("getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()") { value, _ in
                            self.finish(value as? String == "#f4f5f7" ? nil : "Theme menu did not change the page")
                        }
                    }
                }
            }
        }
    }

    func finish(_ error: String?) {
        timer?.invalidate()
        windows.forEach { $0.stop(); $0.close() }
        if let error = error { fputs("FAIL: \(error)\n", stderr); exit(1) }
        print("PASS: two native tabs, full content area, JavaScript, r2 output, theme switching")
        NSApp.terminate(nil)
    }
}

@main
enum UITest {
    static func main() {
        let app = NSApplication.shared
        let delegate = UITestDelegate()
        app.setActivationPolicy(.regular)
        app.delegate = delegate
        withExtendedLifetime(delegate) { app.run() }
    }
}
