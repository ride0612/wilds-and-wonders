# Windows desktop shell

`Program.cs` hosts the game in a WinForms window using Microsoft Edge WebView2.

Run `./build.ps1` from the repository root to build the Windows x64 application.
Run `node test.cjs` for game and save-system tests.
After building, use `release/WildsAndWonders/WildsAndWonders.exe --smoke-test` for desktop interaction checks. These checks use a separate test profile.

See the root README and `使用说明.txt` for gameplay and system requirements.
