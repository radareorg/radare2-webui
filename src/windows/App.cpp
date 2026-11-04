// MFC widgets and the shared Evergreen WebView2 runtime. No bundled engine.
#include <afxwin.h>
#include <afxdlgs.h>
#include <afxcmn.h>
#include <winsock2.h>
#include <winhttp.h>
#include <shlobj.h>
#include <wrl.h>
#include <WebView2.h>
#include <filesystem>
#include <algorithm>
#include <memory>
#include <string>
#include <vector>
#include "resource.h"

using Microsoft::WRL::Callback;
using Microsoft::WRL::ComPtr;
namespace fs = std::filesystem;
constexpr UINT OpenButton = 1001, ReloadButton = 1002, CloseButton = 1003, TabControl = 1004;
constexpr UINT UrlCommand = 1010, ExitCommand = 1011, UiFirst = 1020, ThemeFirst = 1030;
constexpr UINT NewWindowCommand = 1040, OpenTabCommand = 1041, SelectTabFirst = 1050;
constexpr UINT FullscreenCommand = 1060;
constexpr UINT FileDropMessage = WM_APP + 1;

static UINT shortcutCommand(UINT key) {
    if (key == VK_F5) return ReloadButton;
    if (!(GetKeyState(VK_CONTROL) & 0x8000)) return 0;
    if (key >= '1' && key <= '9') return SelectTabFirst + key - '1';
    switch (key) {
    case 'N': return NewWindowCommand;
    case 'O': return OpenButton;
    case 'T': return OpenTabCommand;
    case 'W': return CloseButton;
    case 'R': return ReloadButton;
    case 'L': return UrlCommand;
    case 'Q': return ExitCommand;
    case 'F': return FullscreenCommand;
    default: return 0;
    }
}

static std::wstring environment(const wchar_t *name) {
    DWORD length = GetEnvironmentVariableW(name, nullptr, 0);
    if (!length) return {};
    std::vector<wchar_t> buffer(length);
    GetEnvironmentVariableW(name, buffer.data(), length);
    return buffer.data();
}

// CommandLineToArgvW quoting, including embedded quotes and trailing slashes.
static std::wstring quote(const std::wstring &value) {
    std::wstring result = L"\"";
    size_t slashes = 0;
    for (wchar_t c : value) {
        if (c == L'\\') { ++slashes; continue; }
        result.append(slashes * (c == L'\"' ? 2 : 1), L'\\');
        if (c == L'\"') result += L'\\';
        result += c;
        slashes = 0;
    }
    result.append(slashes * 2, L'\\');
    return result + L'\"';
}

static std::wstring errorText(const wchar_t *message) {
    return std::wstring(message) + L" (Windows error " + std::to_wstring(GetLastError()) + L").";
}

static std::wstring fileTitle(const std::wstring &file) {
    return file == L"-" ? L"Untitled" : fs::path(file).filename().wstring();
}

struct Settings {
    std::wstring executable, root, ui;
    Settings() {
        std::wstring binary = environment(L"R2");
        if (binary.empty()) binary = L"r2.exe";
        std::vector<wchar_t> path(32768);
        DWORD length = SearchPathW(nullptr, binary.c_str(), L".exe", DWORD(path.size()), path.data(), nullptr);
        if (!length || length >= path.size()) throw std::wstring(L"Cannot find radare2. Install r2 or set R2 to its executable path.");
        executable = path.data();
        ui = environment(L"R2_WEBUI_UI");
        if (ui.empty()) ui = L"t";
        if (ui.find_first_not_of(L"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-") != std::wstring::npos)
            throw std::wstring(L"R2_WEBUI_UI must be a UI directory name.");
        root = environment(L"R2_WEBUI_ROOT");
        if (!root.empty()) {
            root = fs::absolute(root).wstring();
            if (!fs::is_regular_file(fs::path(root) / ui / L"index.html"))
                throw std::wstring(L"R2_WEBUI_ROOT must contain " + ui + L"/index.html.");
        } else {
            GetModuleFileNameW(nullptr, path.data(), DWORD(path.size()));
            for (fs::path base : {fs::path(path.data()).parent_path(), fs::current_path()}) {
                for (int i = 0; i < 8 && root.empty(); ++i, base = base.parent_path()) {
                    for (const auto *name : {L"webui", L"dist", L"dev", L"www"}) {
                        fs::path candidate = base / name;
                        if (fs::is_regular_file(candidate / ui / L"index.html")) {
                            root = candidate.wstring();
                            break;
                        }
                    }
                }
                if (!root.empty()) break;
            }
        }
    }
};

struct Session {
    HANDLE process = nullptr, job = nullptr;
    HINTERNET client = nullptr, connection = nullptr;
    unsigned short port = 0;
    ULONGLONG deadline = 0;
    std::wstring origin, uri, token;

    void start(const std::wstring &file, const Settings &settings) {
        SOCKET reservation = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        if (reservation == INVALID_SOCKET) throw std::wstring(L"Cannot create a loopback socket.");
        sockaddr_in address{};
        address.sin_family = AF_INET;
        address.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
        int size = sizeof(address);
        // SO_EXCLUSIVEADDRUSE prevents another local listener sharing this port.
        BOOL exclusive = TRUE;
        setsockopt(reservation, SOL_SOCKET, SO_EXCLUSIVEADDRUSE, reinterpret_cast<char *>(&exclusive), sizeof(exclusive));
        if (bind(reservation, reinterpret_cast<sockaddr *>(&address), size) ||
            getsockname(reservation, reinterpret_cast<sockaddr *>(&address), &size)) {
            closesocket(reservation);
            throw std::wstring(L"Cannot reserve a loopback port.");
        }
        port = ntohs(address.sin_port);
        origin = L"http://127.0.0.1:" + std::to_wstring(port);
        uri = origin + L"/" + settings.ui + L"/";
        GUID guid;
        if (FAILED(CoCreateGuid(&guid))) { closesocket(reservation); throw std::wstring(L"Cannot create a session identifier."); }
        wchar_t guidText[40];
        StringFromGUID2(guid, guidText, 40);
        token = guidText;
        std::vector<std::wstring> args = { settings.executable, L"-N", L"-q", L"-e", L"scr.color=0", L"-e", L"http.sandbox=false",
            L"-e", L"http.bind=127.0.0.1", L"-e", L"http.port=" + std::to_wstring(port),
            L"-e", L"http.maxport=" + std::to_wstring(port), L"-e", L"http.cors=false",
            L"-e", L"http.referer=" + origin + L"/", L"-e", L"http.ui=" + settings.ui };
        if (!settings.root.empty()) {
            args.insert(args.end(), {L"-e", L"http.root=" + settings.root, L"-e", L"http.homeroot=" + settings.root});
        }
        args.insert(args.end(), {L"-c", L"k r2webui.session=" + token, L"-c", L"=h", file});
        std::wstring command;
        for (const auto &arg : args) command += quote(arg) + L" ";
        job = CreateJobObjectW(nullptr, nullptr);
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{};
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        if (!job || !SetInformationJobObject(job, JobObjectExtendedLimitInformation, &limits, sizeof(limits))) {
            closesocket(reservation);
            throw errorText(L"Cannot create the radare2 job");
        }
        STARTUPINFOW startup{};
        startup.cb = sizeof(startup);
        PROCESS_INFORMATION child{};
        closesocket(reservation);
        if (!CreateProcessW(settings.executable.c_str(), command.data(), nullptr, nullptr, FALSE,
                            CREATE_NO_WINDOW | CREATE_SUSPENDED, nullptr, nullptr, &startup, &child))
            throw errorText(L"Cannot start radare2");
        process = child.hProcess;
        if (!AssignProcessToJobObject(job, process)) {
            TerminateProcess(process, 1);
            CloseHandle(child.hThread);
            throw errorText(L"Cannot manage the radare2 process lifetime");
        }
        DWORD resumed = ResumeThread(child.hThread);
        CloseHandle(child.hThread);
        if (resumed == DWORD(-1)) throw errorText(L"Cannot resume radare2");
        client = WinHttpOpen(L"r2webui", WINHTTP_ACCESS_TYPE_NO_PROXY, nullptr, nullptr, 0);
        if (!client) throw errorText(L"Cannot create the HTTP client");
        // Polls are bounded; no proxy and only the local server is contacted.
        WinHttpSetTimeouts(client, 100, 100, 100, 100);
        connection = WinHttpConnect(client, L"127.0.0.1", port, 0);
        if (!connection) throw errorText(L"Cannot connect to the local server");
        deadline = GetTickCount64() + 30000;
    }

    bool probe() {
        HINTERNET probe = WinHttpOpenRequest(connection, L"GET", L"/cmd/k%20r2webui.session", nullptr,
                                             (origin + L"/").c_str(), WINHTTP_DEFAULT_ACCEPT_TYPES, 0);
        if (!probe) return false;
        // Do not follow redirects to another service during readiness checks.
        DWORD disabled = WINHTTP_DISABLE_REDIRECTS;
        WinHttpSetOption(probe, WINHTTP_OPTION_DISABLE_FEATURE, &disabled, sizeof(disabled));
        bool valid = false;
        if (WinHttpSendRequest(probe, nullptr, 0, nullptr, 0, 0, 0) && WinHttpReceiveResponse(probe, nullptr)) {
            DWORD code = 0, size = sizeof(code);
            WinHttpQueryHeaders(probe, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
                                nullptr, &code, &size, nullptr);
            std::string body;
            char buffer[128];
            DWORD count;
            while (body.size() < 512 && WinHttpReadData(probe, buffer, sizeof(buffer), &count) && count)
                body.append(buffer, count);
            while (!body.empty() && (body.back() == '\r' || body.back() == '\n' || body.back() == ' ')) body.pop_back();
            valid = code == 200 && body == std::string(token.begin(), token.end());
        }
        WinHttpCloseHandle(probe);
        return valid;
    }

    void stop() {
        if (connection) { WinHttpCloseHandle(connection); connection = nullptr; }
        if (client) { WinHttpCloseHandle(client); client = nullptr; }
        if (job) { CloseHandle(job); job = nullptr; }
        if (process) { WaitForSingleObject(process, 2000); CloseHandle(process); process = nullptr; }
    }
    ~Session() { stop(); }
};

struct WindowState {
    HWND hwnd = nullptr;
    Session session;
    ComPtr<ICoreWebView2Controller> controller;
    ComPtr<ICoreWebView2> web;
    bool loaded = false;
    bool visible = true;
    std::wstring root, theme = L"default";
    std::wstring droppedFile;
};

static void showError(HWND hwnd, const std::wstring &message) {
    MessageBoxW(hwnd, message.c_str(), L"radare2", MB_OK | MB_ICONERROR);
}

static void resizeWeb(const std::shared_ptr<WindowState> &state) {
    if (state->controller && state->hwnd) {
        RECT bounds;
        GetClientRect(state->hwnd, &bounds);
        bounds.top = 32;
        state->controller->put_Bounds(bounds);
    }
}

static void applyTheme(const std::shared_ptr<WindowState> &state) {
    if (!state->web) return;
    std::wstring css;
    if (state->theme == L"light") css = L":root{color-scheme:light;--bg:#f4f5f7!important;--pane:#fff!important;--fg:#20242b!important;--dim:#687180!important;--sel:#dce4ed!important;--bd:#c6cbd3!important}";
    if (state->theme == L"dark") css = L":root{color-scheme:dark;--bg:#0d0f12!important;--pane:#15181d!important;--fg:#c9d1d9!important;--dim:#5c6370!important;--sel:#2a2f38!important;--bd:#262a31!important}";
    std::wstring script = L"var s=document.getElementById('r2-native-theme');if(!s){s=document.createElement('style');s.id='r2-native-theme';document.head.appendChild(s)}s.textContent='" + css + L"'";
    state->web->ExecuteScript(script.c_str(), nullptr);
}

static void createWebView(const std::shared_ptr<WindowState> &state) {
    PWSTR local = nullptr;
    if (FAILED(SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, nullptr, &local))) {
        showError(state->hwnd, L"Cannot locate the WebView2 data folder.");
        return;
    }
    std::wstring dataFolder = std::wstring(local) + L"\\radare2-webui\\WebView2";
    CoTaskMemFree(local);
    HRESULT hr = CreateCoreWebView2EnvironmentWithOptions(nullptr, dataFolder.c_str(), nullptr,
        Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
        [state](HRESULT result, ICoreWebView2Environment *environment) -> HRESULT {
            if (!state->hwnd) return S_OK;
            if (FAILED(result) || !environment) {
                showError(state->hwnd, L"Cannot initialize WebView2. Install the Microsoft Edge WebView2 Evergreen Runtime.");
                state->session.stop();
                return S_OK;
            }
            HRESULT created = environment->CreateCoreWebView2Controller(state->hwnd,
                Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                [state](HRESULT result, ICoreWebView2Controller *controller) -> HRESULT {
                    if (!state->hwnd) { if (controller) controller->Close(); return S_OK; }
                    if (FAILED(result) || !controller) {
                        showError(state->hwnd, L"Cannot create the browser control.");
                        state->session.stop();
                        return S_OK;
                    }
                    state->controller = controller;
                    controller->put_IsVisible(state->visible);
                    if (FAILED(controller->get_CoreWebView2(&state->web))) {
                        showError(state->hwnd, L"Cannot access the browser control.");
                        state->session.stop();
                        return S_OK;
                    }
                    std::weak_ptr<WindowState> weak = state;
                    EventRegistrationToken token;
                    controller->add_AcceleratorKeyPressed(Callback<ICoreWebView2AcceleratorKeyPressedEventHandler>(
                        [weak](ICoreWebView2Controller *, ICoreWebView2AcceleratorKeyPressedEventArgs *args) -> HRESULT {
                            auto state = weak.lock();
                            if (!state || !state->hwnd || !IsWindowEnabled(state->hwnd)) return S_OK;
                            COREWEBVIEW2_KEY_EVENT_KIND kind;
                            UINT key = 0;
                            if (FAILED(args->get_KeyEventKind(&kind)) ||
                                (kind != COREWEBVIEW2_KEY_EVENT_KIND_KEY_DOWN && kind != COREWEBVIEW2_KEY_EVENT_KIND_SYSTEM_KEY_DOWN) ||
                                FAILED(args->get_VirtualKey(&key))) return S_OK;
                            UINT command = shortcutCommand(key);
                            if (!command) return S_OK;
                            args->put_Handled(TRUE);
                            COREWEBVIEW2_PHYSICAL_KEY_STATUS status{};
                            if (SUCCEEDED(args->get_PhysicalKeyStatus(&status)) && !status.WasKeyDown)
                                PostMessageW(state->hwnd, WM_COMMAND, command, 0);
                            return S_OK;
                        }).Get(), &token);
                    state->web->AddScriptToExecuteOnDocumentCreated(LR"JS(
                        document.addEventListener('dragover', event => {
                            if ([...event.dataTransfer.types].includes('Files')) {
                                event.preventDefault(); event.stopImmediatePropagation();
                                event.dataTransfer.dropEffect = 'copy';
                            }
                        }, true);
                        document.addEventListener('drop', event => {
                            if (event.dataTransfer.files.length) {
                                event.preventDefault(); event.stopImmediatePropagation();
                                chrome.webview.postMessageWithAdditionalObjects('r2-file-drop', [...event.dataTransfer.files]);
                            }
                        }, true);
                    )JS", nullptr);
                    state->web->add_WebMessageReceived(Callback<ICoreWebView2WebMessageReceivedEventHandler>(
                        [weak](ICoreWebView2 *, ICoreWebView2WebMessageReceivedEventArgs *args) -> HRESULT {
                            auto state = weak.lock();
                            if (!state || !state->hwnd) return S_OK;
                            LPWSTR raw = nullptr;
                            if (FAILED(args->get_Source(&raw))) return S_OK;
                            std::wstring source = raw;
                            CoTaskMemFree(raw);
                            if (source.find(state->session.origin + L"/") != 0) return S_OK;
                            if (FAILED(args->TryGetWebMessageAsString(&raw))) return S_OK;
                            std::wstring message = raw;
                            CoTaskMemFree(raw);
                            if (message != L"r2-file-drop") return S_OK;
                            ComPtr<ICoreWebView2WebMessageReceivedEventArgs2> extended;
                            ComPtr<ICoreWebView2ObjectCollectionView> objects;
                            ComPtr<IUnknown> object;
                            ComPtr<ICoreWebView2File> file;
                            UINT32 count = 0;
                            if (SUCCEEDED(args->QueryInterface(IID_PPV_ARGS(&extended))) &&
                                SUCCEEDED(extended->get_AdditionalObjects(&objects)) && objects &&
                                SUCCEEDED(objects->get_Count(&count)) && count &&
                                SUCCEEDED(objects->GetValueAtIndex(0, &object)) && object &&
                                SUCCEEDED(object.As(&file)) && SUCCEEDED(file->get_Path(&raw))) {
                                state->droppedFile = raw;
                                CoTaskMemFree(raw);
                                PostMessageW(state->hwnd, FileDropMessage, 0, 0);
                            }
                            return S_OK;
                        }).Get(), &token);
                    state->web->add_NavigationCompleted(Callback<ICoreWebView2NavigationCompletedEventHandler>(
                        [weak](ICoreWebView2 *, ICoreWebView2NavigationCompletedEventArgs *) -> HRESULT {
                            if (auto state = weak.lock()) applyTheme(state);
                            return S_OK;
                        }).Get(), &token);
                    state->web->add_NavigationStarting(Callback<ICoreWebView2NavigationStartingEventHandler>(
                        [weak](ICoreWebView2 *, ICoreWebView2NavigationStartingEventArgs *args) -> HRESULT {
                            auto state = weak.lock();
                            if (!state) { args->put_Cancel(TRUE); return S_OK; }
                            LPWSTR raw = nullptr;
                            if (SUCCEEDED(args->get_Uri(&raw))) {
                                std::wstring uri = raw;
                                CoTaskMemFree(raw);
                                if (uri.find(state->session.origin + L"/") != 0 && uri != L"about:blank") args->put_Cancel(TRUE);
                            }
                            return S_OK;
                        }).Get(), &token);
                    state->web->add_NewWindowRequested(Callback<ICoreWebView2NewWindowRequestedEventHandler>(
                        [](ICoreWebView2 *, ICoreWebView2NewWindowRequestedEventArgs *args) -> HRESULT {
                            args->put_Handled(TRUE); return S_OK;
                        }).Get(), &token);
                    resizeWeb(state);
                    return S_OK;
                }).Get());
            if (FAILED(created)) { showError(state->hwnd, L"Cannot create WebView2."); state->session.stop(); }
            return S_OK;
        }).Get());
    if (FAILED(hr)) {
        showError(state->hwnd, L"WebView2 is unavailable. Install the Microsoft Edge WebView2 Evergreen Runtime.");
        state->session.stop();
    }
}

// A small native modal dialog, without resource files or an always-visible bar.
class UrlDialog : public CDialog {
    struct alignas(DWORD) Template {
        DLGTEMPLATE dialog{};
        WORD menu = 0, windowClass = 0, title = 0;
    } layout;
    CEdit input;
    CButton ok, cancel;
public:
    CString value;
    UrlDialog(CWnd *parent, const std::wstring &uri) : value(uri.c_str()) {
        layout.dialog.style = WS_POPUP | WS_CAPTION | WS_SYSMENU | DS_MODALFRAME;
        layout.dialog.cx = 360; layout.dialog.cy = 65;
        InitModalIndirect(&layout.dialog, parent);
    }
    BOOL OnInitDialog() override {
        CDialog::OnInitDialog();
        SetWindowText(L"Open URL on this tab’s radare2 server");
        CRect bounds; GetClientRect(&bounds);
        input.Create(WS_CHILD | WS_VISIBLE | WS_BORDER | WS_TABSTOP | ES_AUTOHSCROLL,
                     CRect(12, 12, bounds.right - 12, 38), this, 2001);
        input.SetWindowText(value);
        ok.Create(L"Open", WS_CHILD | WS_VISIBLE | WS_TABSTOP | BS_DEFPUSHBUTTON,
                  CRect(bounds.right - 184, 50, bounds.right - 104, 78), this, IDOK);
        cancel.Create(L"Cancel", WS_CHILD | WS_VISIBLE | WS_TABSTOP | BS_PUSHBUTTON,
                      CRect(bounds.right - 92, 50, bounds.right - 12, 78), this, IDCANCEL);
        input.SetFocus(); input.SetSel(0, -1);
        return FALSE;
    }
    void OnOK() override { input.GetWindowText(value); CDialog::OnOK(); }
};

class BrowserWindow : public CFrameWnd {
    struct Tab {
        std::shared_ptr<WindowState> state = std::make_shared<WindowState>();
        std::wstring file;
    };
    std::vector<Tab> pages;
    CTabCtrl tabs;
    CMenu menu;
    bool fullscreen = false;
    WINDOWPLACEMENT normalPlacement{sizeof(WINDOWPLACEMENT)};
    LONG_PTR normalStyle = 0;
    std::wstring droppedFile;
    static std::vector<BrowserWindow *> frames;
    DECLARE_MESSAGE_MAP()

    void activate(int index) {
        tabs.SetCurSel(index);
        for (int i = 0; i < int(pages.size()); ++i) {
            auto &state = pages[i].state;
            state->visible = i == index;
            if (state->controller) state->controller->put_IsVisible(state->visible);
        }
        if (index >= 0 && index < int(pages.size())) {
            auto &page = pages[index];
            SetWindowText((fileTitle(page.file) + L" — radare2").c_str());
            if (page.state->controller)
                page.state->controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC);
        }
    }
    void addFile(const std::wstring &file) {
        try {
            Settings settings;
            Tab page;
            page.file = file;
            page.state->root = settings.root;
            page.state->hwnd = m_hWnd;
            page.state->session.start(file, settings);
            pages.push_back(page);
            CString label(fileTitle(file).c_str());
            tabs.InsertItem(int(pages.size()) - 1, label);
            activate(int(pages.size()) - 1);
            createWebView(page.state);
        } catch (const std::wstring &message) { showError(m_hWnd, message); }
          catch (const std::exception &) { showError(m_hWnd, L"Cannot open the file or locate the web UI."); }
    }
    void closeTab(int index) {
        if (index < 0 || index >= int(pages.size())) return;
        auto state = pages[index].state;
        state->hwnd = nullptr;
        if (state->controller) state->controller->Close();
        state->web.Reset(); state->controller.Reset();
        state->session.stop();
        pages.erase(pages.begin() + index);
        tabs.DeleteItem(index);
        if (pages.empty()) DestroyWindow();
        else activate((std::min)(index, int(pages.size()) - 1));
    }
public:
    static bool hasWindows() { return !frames.empty(); }
    static BrowserWindow *fromWindow(HWND hwnd) {
        HWND root = GetAncestor(hwnd, GA_ROOT);
        for (auto *frame : frames) if (frame->GetSafeHwnd() == root) return frame;
        return nullptr;
    }
    bool start(const std::wstring &file) {
        if (!Create(nullptr, L"radare2", WS_OVERLAPPEDWINDOW, CRect(80, 80, 1280, 880))) return false;
        frames.push_back(this);
        HICON icon = AfxGetApp()->LoadIcon(IDI_R2WEBUI);
        SetIcon(icon, TRUE);
        SetIcon(icon, FALSE);
        CMenu fileMenu, viewMenu, uiMenu, themeMenu, windowMenu;
        menu.CreateMenu(); fileMenu.CreatePopupMenu(); viewMenu.CreatePopupMenu(); uiMenu.CreatePopupMenu(); themeMenu.CreatePopupMenu(); windowMenu.CreatePopupMenu();
        fileMenu.AppendMenu(MF_STRING, NewWindowCommand, L"&New Window\tCtrl+N");
        fileMenu.AppendMenu(MF_STRING, OpenButton, L"&Open…\tCtrl+O");
        fileMenu.AppendMenu(MF_STRING, OpenTabCommand, L"Open in New &Tab…\tCtrl+T");
        fileMenu.AppendMenu(MF_STRING, CloseButton, L"&Close Tab\tCtrl+W");
        fileMenu.AppendMenu(MF_SEPARATOR);
        fileMenu.AppendMenu(MF_STRING, ExitCommand, L"E&xit\tCtrl+Q");
        viewMenu.AppendMenu(MF_STRING, ReloadButton, L"&Reload\tF5");
        viewMenu.AppendMenu(MF_STRING, UrlCommand, L"Open &URL…\tCtrl+L");
        viewMenu.AppendMenu(MF_STRING, FullscreenCommand, L"Toggle &Full Screen\tCtrl+F");
        const wchar_t *uis[] = {L"Tiles", L"Material", L"Panels", L"Enyo"};
        for (UINT i = 0; i < 4; ++i) uiMenu.AppendMenu(MF_STRING, UiFirst + i, uis[i]);
        const wchar_t *themes[] = {L"Web UI Default", L"Light", L"Dark"};
        for (UINT i = 0; i < 3; ++i) themeMenu.AppendMenu(MF_STRING, ThemeFirst + i, themes[i]);
        viewMenu.AppendMenu(MF_POPUP, UINT_PTR(uiMenu.Detach()), L"Web UI");
        viewMenu.AppendMenu(MF_POPUP, UINT_PTR(themeMenu.Detach()), L"Theme");
        menu.AppendMenu(MF_POPUP, UINT_PTR(fileMenu.Detach()), L"&File");
        menu.AppendMenu(MF_POPUP, UINT_PTR(viewMenu.Detach()), L"&View");
        for (UINT i = 0; i < 9; ++i) {
            std::wstring label = L"Select Tab " + std::to_wstring(i + 1) + L"\tCtrl+" + std::to_wstring(i + 1);
            windowMenu.AppendMenu(MF_STRING, SelectTabFirst + i, label.c_str());
        }
        menu.AppendMenu(MF_POPUP, UINT_PTR(windowMenu.Detach()), L"&Window");
        SetMenu(&menu);
        DragAcceptFiles(TRUE);
        tabs.Create(WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS | TCS_SINGLELINE, CRect(0, 0, 1200, 32), this, TabControl);
        addFile(file);
        SetTimer(1, 150, nullptr);
        ShowWindow(SW_SHOW);
        return true;
    }
    static HWND openFile(const std::wstring &file, HWND tabParent = nullptr) {
        if (auto *frame = fromWindow(tabParent)) { frame->addFile(file); return frame->m_hWnd; }
        auto *frame = new BrowserWindow();
        if (!frame->start(file)) return nullptr;
        return frame->m_hWnd;
    }
    static void choose(HWND parent, const std::wstring &initialFile = {}, bool openInTab = true) {
        CFileDialog dialog(TRUE, nullptr, nullptr, OFN_FILEMUSTEXIST | OFN_EXPLORER | OFN_NOCHANGEDIR | OFN_ALLOWMULTISELECT,
                           L"All files (*.*)|*.*||", CWnd::FromHandle(parent));
        std::vector<wchar_t> paths(65536);
        initialFile.copy(paths.data(), (std::min)(initialFile.size(), paths.size() - 1));
        dialog.m_ofn.lpstrFile = paths.data();
        dialog.m_ofn.nMaxFile = DWORD(paths.size());
        if (dialog.DoModal() == IDOK) {
            HWND target = openInTab ? parent : nullptr;
            POSITION position = dialog.GetStartPosition();
            while (position) {
                HWND opened = openFile(dialog.GetNextPathName(position).GetString(), target);
                if (openInTab && opened) target = opened;
            }
        }
    }
    static bool handleMessage(MSG *message) {
        auto *current = fromWindow(message->hwnd);
        if (!current || !IsWindowEnabled(current->m_hWnd) || message->message != WM_KEYDOWN) return false;
        UINT command = shortcutCommand(UINT(message->wParam));
        if (!command) return false;
        if (!(message->lParam & (1L << 30))) current->PostMessage(WM_COMMAND, command);
        return true;
    }
    afx_msg void OnNewWindow() { openFile(L"-"); }
    afx_msg void OnOpen() { choose(m_hWnd, {}, false); }
    afx_msg void OnOpenTab() { choose(m_hWnd); }
    afx_msg void OnSelectTab(UINT id) {
        int index = int(id - SelectTabFirst);
        if (index >= 0 && index < int(pages.size())) activate(index);
    }
    afx_msg void OnDropFiles(HDROP drop) {
        UINT size = DragQueryFileW(drop, 0, nullptr, 0);
        if (size) {
            std::vector<wchar_t> path(size + 1);
            DragQueryFileW(drop, 0, path.data(), UINT(path.size()));
            droppedFile = path.data();
            PostMessage(FileDropMessage);
        }
        DragFinish(drop);
    }
    afx_msg LRESULT OnFileDrop(WPARAM, LPARAM) {
        std::wstring path = std::move(droppedFile);
        droppedFile.clear();
        for (auto &page : pages) {
            if (path.empty()) path = std::move(page.state->droppedFile);
            page.state->droppedFile.clear();
        }
        if (!path.empty() && IsWindowEnabled(m_hWnd)) choose(m_hWnd, path);
        return 0;
    }
    afx_msg void OnCloseTab() { closeTab(tabs.GetCurSel()); }
    afx_msg void OnFullscreen() {
        if (!fullscreen) {
            MONITORINFO monitor{sizeof(MONITORINFO)};
            if (!GetWindowPlacement(&normalPlacement) ||
                !GetMonitorInfoW(MonitorFromWindow(m_hWnd, MONITOR_DEFAULTTONEAREST), &monitor)) return;
            normalStyle = GetWindowLongPtrW(m_hWnd, GWL_STYLE);
            SetWindowLongPtrW(m_hWnd, GWL_STYLE, normalStyle & ~LONG_PTR(WS_OVERLAPPEDWINDOW));
            fullscreen = true;
            const RECT &bounds = monitor.rcMonitor;
            SetWindowPos(&wndTop, bounds.left, bounds.top, bounds.right - bounds.left,
                         bounds.bottom - bounds.top, SWP_FRAMECHANGED | SWP_NOOWNERZORDER);
        } else {
            fullscreen = false;
            SetWindowLongPtrW(m_hWnd, GWL_STYLE, normalStyle);
            SetWindowPlacement(&normalPlacement);
            SetWindowPos(nullptr, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER |
                         SWP_NOOWNERZORDER | SWP_FRAMECHANGED);
        }
    }
    afx_msg void OnExit() {
        for (auto *frame : std::vector<BrowserWindow *>(frames)) frame->DestroyWindow();
    }
    afx_msg void OnURL() {
        int index = tabs.GetCurSel();
        if (index < 0) return;
        auto state = pages[index].state;
        LPWSTR raw = nullptr;
        std::wstring uri = state->session.uri;
        if (state->web && SUCCEEDED(state->web->get_Source(&raw))) { uri = raw; CoTaskMemFree(raw); }
        UrlDialog dialog(this, uri);
        if (dialog.DoModal() == IDOK) {
            uri = dialog.value.GetString();
            if (state->web && uri.find(state->session.origin + L"/") == 0) state->web->Navigate(uri.c_str());
        }
    }
    afx_msg void OnUI(UINT id) {
        int index = tabs.GetCurSel();
        if (index < 0) return;
        auto state = pages[index].state;
        const wchar_t *uis[] = {L"t", L"m", L"p", L"enyo"};
        std::wstring ui = uis[id - UiFirst];
        std::error_code error;
        if (!state->root.empty() && !fs::is_regular_file(fs::path(state->root) / ui / L"index.html", error)) {
            showError(m_hWnd, L"Build this web UI and rebuild the app, or set R2_WEBUI_ROOT to a directory containing it.");
            return;
        }
        if (state->web) state->web->Navigate((state->session.origin + L"/" + ui + L"/").c_str());
    }
    afx_msg void OnTheme(UINT id) {
        int index = tabs.GetCurSel();
        if (index < 0) return;
        const wchar_t *themes[] = {L"default", L"light", L"dark"};
        pages[index].state->theme = themes[id - ThemeFirst];
        applyTheme(pages[index].state);
    }
    afx_msg void OnReload() {
        int index = tabs.GetCurSel();
        if (index >= 0 && pages[index].state->web) pages[index].state->web->Reload();
    }
    afx_msg void OnTabChanged(NMHDR *, LRESULT *result) { activate(tabs.GetCurSel()); *result = 0; }
    afx_msg void OnSize(UINT type, int width, int height) {
        CFrameWnd::OnSize(type, width, height);
        if (tabs.GetSafeHwnd()) tabs.MoveWindow(0, 0, width, 32);
        for (auto &page : pages) resizeWeb(page.state);
    }
    afx_msg void OnTimer(UINT_PTR) {
        for (auto &page : pages) {
            auto state = page.state;
            auto &session = state->session;
            if (!session.process) continue;
            if (WaitForSingleObject(session.process, 0) == WAIT_OBJECT_0) {
                DWORD code = 0;
                GetExitCodeProcess(session.process, &code);
                session.stop();
                showError(m_hWnd, fileTitle(page.file) + L": radare2 exited (status " + std::to_wstring(code) + L").");
            } else if (!state->loaded) {
                if (GetTickCount64() > session.deadline) {
                    session.stop();
                    showError(m_hWnd, L"Timed out waiting for radare2 or WebView2.");
                } else if (state->web && session.probe()) {
                    state->loaded = true;
                    state->web->Navigate(session.uri.c_str());
                }
            }
        }
    }
    afx_msg void OnDestroy() {
        KillTimer(1);
        for (auto &page : pages) {
            auto state = page.state;
            state->hwnd = nullptr;
            if (state->controller) state->controller->Close();
            state->web.Reset(); state->controller.Reset();
            state->session.stop();
        }
        frames.erase(std::remove(frames.begin(), frames.end(), this), frames.end());
        if (AfxGetApp()->m_pMainWnd == this) AfxGetApp()->m_pMainWnd = nullptr;
        CFrameWnd::OnDestroy();
        if (frames.empty()) PostQuitMessage(0);
    }
    void PostNcDestroy() override { delete this; }
};
std::vector<BrowserWindow *> BrowserWindow::frames;
BEGIN_MESSAGE_MAP(BrowserWindow, CFrameWnd)
    ON_COMMAND(OpenButton, &BrowserWindow::OnOpen)
    ON_COMMAND(NewWindowCommand, &BrowserWindow::OnNewWindow)
    ON_COMMAND(OpenTabCommand, &BrowserWindow::OnOpenTab)
    ON_COMMAND_RANGE(SelectTabFirst, SelectTabFirst + 8, &BrowserWindow::OnSelectTab)
    ON_COMMAND(ReloadButton, &BrowserWindow::OnReload)
    ON_COMMAND(CloseButton, &BrowserWindow::OnCloseTab)
    ON_COMMAND(UrlCommand, &BrowserWindow::OnURL)
    ON_COMMAND(ExitCommand, &BrowserWindow::OnExit)
    ON_COMMAND(FullscreenCommand, &BrowserWindow::OnFullscreen)
    ON_COMMAND_RANGE(UiFirst, UiFirst + 3, &BrowserWindow::OnUI)
    ON_COMMAND_RANGE(ThemeFirst, ThemeFirst + 2, &BrowserWindow::OnTheme)
    ON_NOTIFY(TCN_SELCHANGE, TabControl, &BrowserWindow::OnTabChanged)
    ON_WM_DROPFILES()
    ON_MESSAGE(FileDropMessage, &BrowserWindow::OnFileDrop)
    ON_WM_SIZE()
    ON_WM_TIMER()
    ON_WM_DESTROY()
END_MESSAGE_MAP()

class App : public CWinApp {
    bool sockets = false;
public:
    BOOL InitInstance() override {
        CWinApp::InitInstance();
        if (!AfxOleInit()) return FALSE;
        WSADATA data;
        if (WSAStartup(MAKEWORD(2, 2), &data)) return FALSE;
        sockets = true;
        INITCOMMONCONTROLSEX controls{sizeof(controls), ICC_TAB_CLASSES};
        InitCommonControlsEx(&controls);
        SetProcessDPIAware();
        int argc = 0;
        LPWSTR *args = CommandLineToArgvW(GetCommandLineW(), &argc);
        if (!args) return FALSE;
        if (argc < 2) BrowserWindow::openFile(L"-");
        HWND target = nullptr;
        for (int i = 1; i < argc; ++i) {
            try { target = BrowserWindow::openFile(fs::absolute(args[i]).wstring(), target); }
            catch (const std::exception &) { showError(nullptr, L"Invalid file path."); }
        }
        LocalFree(args);
        // Each top-level frame owns itself; the last frame posts WM_QUIT.
        m_pMainWnd = nullptr;
        return BrowserWindow::hasWindows();
    }
    BOOL PreTranslateMessage(MSG *message) override {
        if (BrowserWindow::handleMessage(message)) return TRUE;
        return CWinApp::PreTranslateMessage(message);
    }
    int ExitInstance() override {
        if (sockets) WSACleanup();
        return CWinApp::ExitInstance();
    }
} app;
