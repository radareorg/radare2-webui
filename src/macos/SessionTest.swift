import Foundation
import Darwin

@main
enum SessionTest {
    static func main() throws {
        let settings = try Settings()
        let first = R2Session(), second = R2Session()
        defer { first.stop(); second.stop() }
        var ready: [URL] = []
        var failure: String?
        for session in [first, second] {
            session.onReady = { ready.append($0) }
            session.onFailure = { failure = $0 }
            try session.start(file: "/bin/ls", settings: settings)
        }
        let deadline = Date().addingTimeInterval(35)
        while ready.count < 2 && failure == nil && Date() < deadline {
            RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        }
        guard ready.count == 2, first.port != second.port else {
            fatalError(failure ?? "Servers did not start on distinct ports")
        }
        // Fetch actual assets and exercise the command endpoint on both servers.
        for url in ready {
            let page = try String(contentsOf: url, encoding: .utf8)
            precondition(page.lowercased().contains("<html"), "UI was not served")
            for asset in ["app.js", "stylesheet.css"] {
                let text = try String(contentsOf: url.appendingPathComponent(asset), encoding: .utf8)
                precondition(!text.contains("<html") && text.count > 1000, "Missing UI asset: \(asset)")
            }
            var request = URLRequest(url: URL(string: "http://127.0.0.1:\(url.port!)/cmd/ij")!)
            request.setValue(url.absoluteString, forHTTPHeaderField: "Referer")
            let done = DispatchSemaphore(value: 0)
            var valid = false
            URLSession.shared.dataTask(with: request) { data, _, _ in
                if let data = data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    valid = json["core"] != nil
                }
                done.signal()
            }.resume()
            precondition(done.wait(timeout: .now() + 5) == .success && valid, "Command endpoint failed")
        }
        first.stop()
        precondition(first.process?.isRunning == false)
        precondition(second.process?.isRunning == true, "Closing one session stopped another")
        second.stop()
        precondition(second.process?.isRunning == false)
        let broken = R2Session()
        var rejected = false
        broken.onFailure = { _ in rejected = true }
        try broken.start(file: "/nonexistent-r2webui-test-file", settings: settings)
        let errorDeadline = Date().addingTimeInterval(5)
        while !rejected && Date() < errorDeadline { RunLoop.current.run(until: Date().addingTimeInterval(0.05)) }
        precondition(rejected, "Early process exit was not reported")
        print("PASS: two ports, UI assets, r2 commands, independent shutdown, startup failure")
    }
}
