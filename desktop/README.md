# Windows desktop shell

`Program.cs` hosts the game in a WinForms window using Microsoft Edge WebView2.

Run `./build.ps1 -OutputFolder 'release/WildsAndWonders-v0.9'` from the repository root to build the Windows x64 application.
Run `node test.cjs` for game and save-system tests.
Run `node server/test.cjs` for the account HTTP/SQLite integration tests.
The Windows package includes Node.js 24 and starts the loopback-only server on port 18765. Account data lives under LocalAppData, outside the installation folder. The client transfers a copy of the legacy virtual-host save for optional import on registration. No password or readable session token is stored in frontend storage.
After building, use `release/WildsAndWonders-v0.9/WildsAndWonders.exe --smoke-test` for desktop interaction checks. These checks use a separate test profile, server port 18767 and test database. The normal window waits for account saves before closing; smoke tests explicitly flush before reloading.

See the root README and `使用说明.txt` for gameplay and system requirements.
