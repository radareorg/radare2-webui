# nmake, from an MSVC Native Tools prompt with the MFC component installed.
# WEBVIEW2_SDK points at an extracted Microsoft.Web.WebView2 NuGet package.
!IFNDEF WEBVIEW2_SDK
!ERROR Set WEBVIEW2_SDK to the extracted Microsoft.Web.WebView2 SDK directory
!ENDIF
!IFNDEF ARCH
ARCH=x64
!ENDIF

all: build\r2webui.exe webui

webui:
	@if not exist build\webui\t mkdir build\webui\t
	copy /y ..\..\www\t\index.html build\webui\t\index.html
	copy /b /y ..\..\www\t\js\t.js+..\..\www\t\js\tools.js build\webui\t\app.js
	copy /y ..\..\www\t\css\style.css build\webui\t\stylesheet.css
	@for %U in (m p enyo) do @if exist ..\..\dist\%U\index.html xcopy /e /i /y /q ..\..\dist\%U build\webui\%U
	@for %U in (m p enyo) do @if not exist build\webui\%U\index.html if exist ..\..\dev\%U\index.html xcopy /e /i /y /q ..\..\dev\%U build\webui\%U

build\App.res: App.rc resource.h ..\assets\icons\r2webui.ico
	@if not exist build mkdir build
	rc /nologo /fo $@ App.rc

build\r2webui.exe: App.cpp resource.h build\App.res
	@if not exist build mkdir build
	cl /nologo /std:c++17 /utf-8 /EHsc /O1 /MD /DUNICODE /D_UNICODE /D_AFXDLL /DWIN32_LEAN_AND_MEAN /DNOMINMAX /I"$(WEBVIEW2_SDK)\build\native\include" /Fo:build\App.obj /Fe:$@ App.cpp /link /SUBSYSTEM:WINDOWS /OPT:REF /OPT:ICF build\App.res "$(WEBVIEW2_SDK)\build\native\$(ARCH)\WebView2LoaderStatic.lib" ws2_32.lib winhttp.lib ole32.lib shell32.lib shlwapi.lib version.lib comctl32.lib

run: all
	build\r2webui.exe $(FILE)

clean:
	@if exist build rmdir /s /q build
