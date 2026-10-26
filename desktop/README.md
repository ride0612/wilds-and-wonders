# 绝不认书：次元回响 — Windows shell

WinForms/WebView2 loads local game files through its existing virtual host. No HTTP server, Node runtime, account or registration is used. The original WebView2 user-data directory is retained, while the new chapter uses independent browser-storage keys.

Build: ./build.ps1 -OutputFolder release/WildsAndWonders-Offline
Checks: node test.cjs and node narrative-test.cjs
Export script: node scripts/export-story.cjs

The package includes 绝不认书.exe and keeps WildsAndWonders.exe as a compatibility filename. Both are the same build. On systems permitting the executable, --smoke-test uses an isolated WebView2 profile, exercises all three invitation routes and compact dialogue layout, captures choice/dialogue images, and reloads the saved ending. Results are smoke-offline.json and smoke-story-reload.json.

Current machine limitation: Windows Application Control blocked the newly compiled executable before launch. The embedded browser also rejects file:// navigation. No successful visual-smoke result exists for this revision; earlier smoke logs do not verify it. Browser users can manually open the root index.html; their saves are separate from desktop saves.
