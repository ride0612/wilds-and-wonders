$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$sdkPath = Join-Path $PSScriptRoot '.build\webview2'
if (!(Test-Path -LiteralPath "$sdkPath\lib\net462\Microsoft.Web.WebView2.WinForms.dll")) {
    New-Item -ItemType Directory -Force -Path '.build' | Out-Null
    Invoke-WebRequest -Uri 'https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/1.0.2903.40/microsoft.web.webview2.1.0.2903.40.nupkg' -OutFile '.build\webview2.zip'
    Expand-Archive -LiteralPath '.build\webview2.zip' -DestinationPath $sdkPath -Force
}
$outputPath = Join-Path $PSScriptRoot 'release\WildsAndWonders'
New-Item -ItemType Directory -Force -Path "$outputPath\game" | Out-Null
Copy-Item -LiteralPath 'index.html','style.css','lobby.css','localization.js','story.js','game.js','lobby.js' -Destination "$outputPath\game" -Force
if (Test-Path -LiteralPath 'assets') {
    Copy-Item -LiteralPath 'assets' -Destination "$outputPath\game" -Recurse -Force
}
Copy-Item -LiteralPath "$sdkPath\lib\net462\Microsoft.Web.WebView2.Core.dll","$sdkPath\lib\net462\Microsoft.Web.WebView2.WinForms.dll","$sdkPath\runtimes\win-x64\native\WebView2Loader.dll" -Destination $outputPath -Force
$compilerPath = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compilerPath /nologo /target:winexe /platform:x64 /optimize+ "/out:$outputPath\WildsAndWonders.exe" /reference:System.dll /reference:System.Drawing.dll /reference:System.Windows.Forms.dll "/reference:$outputPath\Microsoft.Web.WebView2.Core.dll" "/reference:$outputPath\Microsoft.Web.WebView2.WinForms.dll" 'desktop\Program.cs'
if ($LASTEXITCODE -ne 0) { throw 'Windows build failed.' }
Copy-Item -LiteralPath 'desktop\使用说明.txt' -Destination $outputPath -Force
Copy-Item -LiteralPath 'THIRD-PARTY-NOTICES.txt' -Destination $outputPath -Force
Compress-Archive -Path "$outputPath\WildsAndWonders.exe","$outputPath\*.dll","$outputPath\game","$outputPath\使用说明.txt","$outputPath\THIRD-PARTY-NOTICES.txt" -DestinationPath 'release\WildsAndWonders-Windows-x64.zip' -Force
Write-Output "Built: $outputPath\WildsAndWonders.exe"
