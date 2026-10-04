$ErrorActionPreference='Stop'
$serverRoot=$PSScriptRoot
$packageRoot=Split-Path $serverRoot -Parent
$nodePath=Join-Path $packageRoot 'runtime/node.exe'
if(!(Test-Path -LiteralPath $nodePath)){$nodePath=(Get-Command node -ErrorAction Stop).Source}
$gamePath=Join-Path $packageRoot 'game'
if(!(Test-Path -LiteralPath $gamePath)){$gamePath=$packageRoot}
$dataPath=Join-Path $env:LOCALAPPDATA 'WildsAndWonders/Server'
& $nodePath (Join-Path $serverRoot 'server.cjs') --port 18765 --game-dir $gamePath --data-dir $dataPath
