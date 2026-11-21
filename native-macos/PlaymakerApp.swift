import AppKit
import WebKit
import UniformTypeIdentifiers

final class PlaymakerApp: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var printView: WKWebView?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.userContentController.add(self, name: "nativeSave")
        config.userContentController.add(self, name: "nativePrint")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = false

        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1320, height: 880),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "Playmaker Tackle"
        window.center()
        window.minSize = NSSize(width: 860, height: 620)
        window.contentView = webView
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        guard let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
            let alert = NSAlert(); alert.messageText = "Playbook files are missing"; alert.informativeText = "Reinstall Playmaker Tackle."; alert.runModal(); NSApp.terminate(nil); return
        }
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "nativeSave":
            guard let body = message.body as? [String: Any], let contents = body["contents"] as? String else { return }
            let panel = NSSavePanel()
            panel.nameFieldStringValue = (body["filename"] as? String) ?? "tackle-playbook.json"
            panel.allowedContentTypes = [.json]
            panel.canCreateDirectories = true
            if panel.runModal() == .OK, let url = panel.url {
                do { try contents.write(to: url, atomically: true, encoding: .utf8) }
                catch { showError("Could not save backup", error.localizedDescription) }
            }
        case "nativePrint":
            guard let html = message.body as? String else { return }
            let view = WKWebView(frame: NSRect(x: 0, y: 0, width: 1100, height: 720))
            view.navigationDelegate = self
            printView = view
            view.loadHTMLString(html, baseURL: nil)
        default: break
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard webView === printView else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) {
            let operation = webView.printOperation(with: NSPrintInfo.shared)
            operation.showsPrintPanel = true
            operation.showsProgressPanel = true
            operation.run()
            self.printView = nil
        }
    }

    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.beginSheetModal(for: window) { result in
            completionHandler(result == .OK ? panel.urls : nil)
        }
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.runModal()
        completionHandler()
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "Continue")
        alert.addButton(withTitle: "Cancel")
        completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (String?) -> Void) {
        let alert = NSAlert()
        alert.messageText = prompt
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        let field = NSTextField(string: defaultText ?? "")
        field.frame = NSRect(x: 0, y: 0, width: 300, height: 24)
        alert.accessoryView = field
        let response = alert.runModal()
        completionHandler(response == .alertFirstButtonReturn ? field.stringValue : nil)
    }

    private func showError(_ title: String, _ detail: String) {
        let alert = NSAlert(); alert.messageText = title; alert.informativeText = detail; alert.alertStyle = .warning; alert.runModal()
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.regular)
let mainMenu = NSMenu()
let appMenuItem = NSMenuItem()
let appMenu = NSMenu()
appMenu.addItem(withTitle: "Quit Playmaker Tackle", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
appMenuItem.submenu = appMenu
mainMenu.addItem(appMenuItem)
app.mainMenu = mainMenu
let delegate = PlaymakerApp()
app.delegate = delegate
app.run()
