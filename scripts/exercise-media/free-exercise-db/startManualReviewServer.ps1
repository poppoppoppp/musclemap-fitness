$ErrorActionPreference = 'Stop'
$ProjectRoot = 'D:\MuscleMap Fitness'
$Port = 4174
$Url = 'http://127.0.0.1:4174/reports/exercise-media/free-exercise-db/manual-review-final-check.html'
$ServerScript = Join-Path $ProjectRoot 'scripts\exercise-media\free-exercise-db\manualReviewServer.mjs'

Set-Location -LiteralPath $ProjectRoot
$Listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($Listener) {
  Write-Error "端口 $Port 已被占用。请先关闭占用进程；脚本不会静默更换端口。"
  exit 1
}

$QuotedServerScript = '"' + $ServerScript + '"'
$Server = Start-Process -FilePath 'node' -ArgumentList @($QuotedServerScript) -WorkingDirectory $ProjectRoot -WindowStyle Hidden -PassThru
for ($Attempt = 0; $Attempt -lt 30; $Attempt += 1) {
  Start-Sleep -Milliseconds 200
  try {
    $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    if ($Response.StatusCode -eq 200) {
      Start-Process $Url
      Write-Host "人工审核页已启动：$Url"
      Write-Host "服务器 PID：$($Server.Id)"
      exit 0
    }
  } catch {
    if ($Server.HasExited) { throw '本地审核服务器启动失败。' }
  }
}

Stop-Process -Id $Server.Id -Force -ErrorAction SilentlyContinue
throw '本地审核服务器在规定时间内未返回 HTTP 200。'
