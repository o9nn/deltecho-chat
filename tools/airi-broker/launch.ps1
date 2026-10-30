param(
  [string]$StageUrl = 'http://127.0.0.1:5173/',
  [int]$Port = 8765,
  [string]$ModelId = 'miara',
  [string]$ModelArchive = (Join-Path $PSScriptRoot 'miara.zip')
)
$ErrorActionPreference = 'Stop'
$node = Join-Path $PSScriptRoot 'node.exe'
$broker = Join-Path $PSScriptRoot 'broker.mjs'
if (-not (Test-Path -LiteralPath $node) -or -not (Test-Path -LiteralPath $broker)) {
  throw 'Place the verified portable node.exe and broker.mjs in the same directory as this launcher.'
}
if (-not (Test-Path -LiteralPath $ModelArchive)) {
  throw 'Provide the private generic Live2D model ZIP via -ModelArchive.'
}
& $node $broker --model $ModelArchive --stage $StageUrl --model-id $ModelId --port $Port
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
