import Foundation
import Darwin

struct Settings {
    let executable: URL
    let root: String?
    let ui: String

    init() throws {
        let env = ProcessInfo.processInfo.environment
        let binary = env["R2"] ?? "r2"
        let paths = (env["PATH"] ?? "").components(separatedBy: ":")
            + ["/opt/homebrew/bin", "/usr/local/bin", NSHomeDirectory() + "/.local/bin", "/usr/bin"]
        guard let path = (binary.contains("/") ? [binary] : paths.map { $0 + "/" + binary })
            .first(where: { FileManager.default.isExecutableFile(atPath: $0) }) else {
            throw SessionError.message("Cannot find radare2. Install r2 or set R2 to its executable path.")
        }
        executable = URL(fileURLWithPath: path)
        ui = env["R2_WEBUI_UI"] ?? "t"
        guard !ui.isEmpty, ui.utf8.allSatisfy({
            (48...57).contains($0) || (65...90).contains($0) || (97...122).contains($0) || $0 == 45 || $0 == 95
        }) else { throw SessionError.message("R2_WEBUI_UI must be a UI directory name.") }
        if let override = env["R2_WEBUI_ROOT"] {
            root = URL(fileURLWithPath: override).standardizedFileURL.path
            guard FileManager.default.fileExists(atPath: root! + "/" + ui + "/index.html") else {
                throw SessionError.message("R2_WEBUI_ROOT must contain \(ui)/index.html.")
            }
        } else {
            var found: String?
            for base in [executableURL(), URL(fileURLWithPath: FileManager.default.currentDirectoryPath)] {
                var directory = base
                for _ in 0..<8 {
                    for name in ["Resources/webui", "webui", "dist", "dev", "www"] {
                        let candidate = directory.appendingPathComponent(name).path
                        if FileManager.default.fileExists(atPath: candidate + "/" + ui + "/index.html") {
                            found = candidate
                            break
                        }
                    }
                    if found != nil { break }
                    directory.deleteLastPathComponent()
                }
                if found != nil { break }
            }
            root = found
        }
    }
}

private func executableURL() -> URL {
    URL(fileURLWithPath: CommandLine.arguments[0]).standardizedFileURL.deletingLastPathComponent()
}

enum SessionError: LocalizedError {
    case message(String)
    var errorDescription: String? { if case .message(let text) = self { return text }; return nil }
}

final class R2Session {
    private(set) var process: Process?
    private(set) var port: UInt16 = 0
    private var timer: Timer?
    private var request: URLSessionDataTask?
    private var client: URLSession?
    private var logURL: URL?
    private var log: FileHandle?
    private var stopped = false
    private var loaded = false
    private let token = UUID().uuidString
    var onReady: ((URL) -> Void)?
    var onFailure: ((String) -> Void)?

    func start(file: String, settings: Settings) throws {
        // Reserve an OS-assigned loopback port until immediately before exec.
        let fd = socket(AF_INET, SOCK_STREAM, 0)
        guard fd >= 0 else { throw SessionError.message("Cannot create a loopback socket.") }
        var reserved = true
        defer { if reserved { close(fd) } }
        var address = sockaddr_in()
        address.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        address.sin_family = sa_family_t(AF_INET)
        address.sin_addr.s_addr = inet_addr("127.0.0.1")
        let bound = withUnsafePointer(to: &address) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { bind(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size)) }
        }
        var size = socklen_t(MemoryLayout<sockaddr_in>.size)
        let named = withUnsafeMutablePointer(to: &address) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { getsockname(fd, $0, &size) }
        }
        guard bound == 0, named == 0 else { throw SessionError.message("Cannot reserve a loopback port.") }
        port = UInt16(bigEndian: address.sin_port)
        let origin = "http://127.0.0.1:\(port)"
        var args = ["-N", "-q", "-e", "scr.color=0", "-e", "http.sandbox=false", "-e", "http.bind=127.0.0.1",
                    "-e", "http.port=\(port)", "-e", "http.maxport=\(port)",
                    "-e", "http.cors=false", "-e", "http.referer=\(origin)/",
                    "-e", "http.ui=\(settings.ui)"]
        if let root = settings.root { args += ["-e", "http.root=\(root)", "-e", "http.homeroot=\(root)"] }
        args += ["-c", "k r2webui.session=\(token)", "-c", "=h", file]
        let child = Process()
        child.executableURL = settings.executable
        child.arguments = args
        child.standardInput = FileHandle.nullDevice
        logURL = FileManager.default.temporaryDirectory.appendingPathComponent("r2webui-\(token).log")
        guard FileManager.default.createFile(atPath: logURL!.path, contents: nil,
                                             attributes: [.posixPermissions: 0o600]) else {
            throw SessionError.message("Cannot create the radare2 log.")
        }
        log = try FileHandle(forWritingTo: logURL!)
        child.standardOutput = log
        child.standardError = log
        child.terminationHandler = { [weak self] child in
            DispatchQueue.main.async {
                guard let self = self, !self.stopped else { return }
                self.fail("radare2 exited (status \(child.terminationStatus)).")
            }
        }
        close(fd)
        reserved = false
        process = child
        do { try child.run() } catch { stop(); throw error }
        let config = URLSessionConfiguration.ephemeral
        config.connectionProxyDictionary = [:]
        config.timeoutIntervalForRequest = 1
        client = URLSession(configuration: config)
        let deadline = Date().addingTimeInterval(30)
        timer = Timer.scheduledTimer(withTimeInterval: 0.15, repeats: true) { [weak self] _ in
            guard let self = self, !self.stopped, !self.loaded else { return }
            if Date() > deadline { self.fail("Timed out waiting for radare2."); return }
            guard self.request == nil else { return }
            var probe = URLRequest(url: URL(string: origin + "/cmd/k%20r2webui.session")!)
            probe.setValue(origin + "/", forHTTPHeaderField: "Referer")
            self.request = self.client?.dataTask(with: probe) { [weak self] data, response, _ in
                DispatchQueue.main.async {
                    guard let self = self, !self.stopped else { return }
                    self.request = nil
                    guard self.process?.isRunning == true,
                          (response as? HTTPURLResponse)?.statusCode == 200,
                          let data = data, String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) == self.token else { return }
                    self.loaded = true
                    self.timer?.invalidate()
                    self.timer = nil
                    self.onReady?(URL(string: origin + "/" + settings.ui + "/")!)
                }
            }
            self.request?.resume()
        }
    }

    private func fail(_ reason: String) {
        var details = ""
        if let url = logURL, let reader = try? FileHandle(forReadingFrom: url) {
            let size = reader.seekToEndOfFile()
            reader.seek(toFileOffset: size > 8192 ? size - 8192 : 0)
            details = String(data: reader.readDataToEndOfFile(), encoding: .utf8) ?? ""
            reader.closeFile()
        }
        stop()
        onFailure?(reason + "\n\n" + details)
    }

    func stop() {
        guard !stopped else { return }
        stopped = true
        timer?.invalidate()
        timer = nil
        request?.cancel()
        client?.invalidateAndCancel()
        if let child = process, child.isRunning {
            child.terminate()
            for _ in 0..<30 { if !child.isRunning { break }; usleep(10_000) }
            if child.isRunning { kill(child.processIdentifier, SIGKILL) }
            child.waitUntilExit()
        }
        log?.closeFile()
        if let url = logURL { try? FileManager.default.removeItem(at: url) }
    }

    deinit { stop() }
}
