#Requires -Version 5.1
<#
dev.ps1 — kanban 前后端一键启停脚本（兼容 Windows PowerShell 5.1）

用法（在仓库根目录执行）：
  powershell -ExecutionPolicy Bypass -File scripts\dev.ps1 -Action start
  powershell -ExecutionPolicy Bypass -File scripts\dev.ps1 -Action start -NoBuild
  powershell -ExecutionPolicy Bypass -File scripts\dev.ps1 -Action stop
  powershell -ExecutionPolicy Bypass -File scripts\dev.ps1 -Action restart -Service backend

行为说明：
  - start   ：确保 WSL pgvector17 数据库可用（含保活会话）→ 后端 mvn clean package
              （-NoBuild 跳过）→ 后台启动后端 8080（日志 app.log/app.err）
              → 后台启动前端 Vite 5175（日志 vite.log/vite.err）
  - stop    ：按端口停前后端进程；不动数据库与 WSL 保活会话（避免 WSL 反复回收再拉起）
  - restart ：stop + start，默认同样会重新打包，快速重启请配 -NoBuild
  - start/restart 遇端口被旧进程占用会自动先停旧进程再启动
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('start', 'stop', 'restart')]
    [string]$Action,

    [ValidateSet('all', 'backend', 'frontend')]
    [string]$Service = 'all',

    [switch]$NoBuild
)

trap { Write-Host "[ERROR] $_" -ForegroundColor Red; exit 1 }

# 防止用户 profile 把 $ErrorActionPreference 设为 Stop 时，
# PS 5.1 对原生命令（wsl/mvn）的 2>$null 重定向抛 NativeCommandError
$ErrorActionPreference = 'Continue'

# ---------------- 常量 ----------------
$Root         = Split-Path -Parent $PSScriptRoot
$BackendDir   = Join-Path $Root 'kanban-backend'
$FrontendDir  = Join-Path $Root 'kanban_web'
$JavaHome     = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { 'D:\jdk\jdk-25.0.4' }
$MvnCmd       = if (Test-Path 'D:\maven-3.9.15\bin\mvn.cmd') { 'D:\maven-3.9.15\bin\mvn.cmd' } else { 'mvn.cmd' }
$BackendPort  = 8080
$FrontendPort = 5175
$BackendJar   = 'target\kanban-backend-boot.jar'
$BackendLog   = Join-Path $BackendDir 'app.log'
$BackendErr   = Join-Path $BackendDir 'app.err'
$FrontendLog  = Join-Path $FrontendDir 'vite.log'
$FrontendErr  = Join-Path $FrontendDir 'vite.err'
$WslDistro    = 'Ubuntu-24.04'
$PgContainer  = 'pgvector17'

# ---------------- 本地密钥 ----------------
# build-test/secrets.env 已被 .gitignore 忽略，仅本地存在；格式为 KEY=VALUE。
$SecretsFile = Join-Path $Root 'build-test\secrets.env'
if (Test-Path $SecretsFile) {
    Get-Content -LiteralPath $SecretsFile -Encoding UTF8 | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
        $idx = $_.IndexOf('=')
        if ($idx -lt 1) { return }
        $key = $_.Substring(0, $idx).Trim()
        $value = $_.Substring($idx + 1)
        [Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
    Write-Host "[ENV] 已加载 $SecretsFile"
} else {
    Write-Host "[ENV] 未找到 $SecretsFile，将使用 application.yml 默认值/系统环境变量" -ForegroundColor Yellow
}

# ---------------- 工具函数 ----------------

# 取监听指定端口的进程 PID（可能多个），无则返回空数组
function Get-PortPid {
    param([int]$Port)
    @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) |
        ForEach-Object { $_.OwningProcess } | Select-Object -Unique
}

# 停掉占用指定端口的所有进程并等端口释放（最多 10 秒），返回是否确实停了进程
function Stop-ByPort {
    param([int]$Port, [string]$Name)
    $pids = @(Get-PortPid -Port $Port)
    if ($pids.Count -eq 0) {
        Write-Host "[SKIP] $Name 未在运行（端口 $Port 无监听）"
        return $false
    }
    foreach ($p in $pids) {
        $procName = ''
        try { $procName = (Get-Process -Id $p -ErrorAction Stop).ProcessName } catch { }
        Write-Host "[STOP] 停止 $Name（PID $p / $procName，端口 $Port）"
        taskkill /PID $p /T /F | Out-Null
    }
    $deadline = (Get-Date).AddSeconds(10)
    while ((Get-Date) -lt $deadline) {
        if (@(Get-PortPid -Port $Port).Count -eq 0) { return $true }
        Start-Sleep -Milliseconds 300
    }
    throw "端口 $Port 释放超时，$Name 未能在 10 秒内停止"
}

# 轮询等待端口出现监听；$WatchPid 对应进程提前退出时打印错误日志末尾并返回失败
function Wait-PortUp {
    param([int]$Port, [int]$TimeoutSec, [int]$WatchPid, [string]$ErrFile)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (@(Get-PortPid -Port $Port).Count -gt 0) { return $true }
        if ($WatchPid -gt 0 -and -not (Get-Process -Id $WatchPid -ErrorAction SilentlyContinue)) {
            Write-Host "[FAIL] 进程提前退出，$ErrFile 末尾内容："
            if (Test-Path $ErrFile) { Get-Content $ErrFile -Tail 25 | ForEach-Object { Write-Host "  $_" } }
            return $false
        }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

# ---------------- 数据库（WSL pgvector17） ----------------

# 确保数据库可用：容器运行 + 常驻保活会话 + pg_isready 通过。
# 背景：WSL2 无常驻会话时整体回收，pgvector17（restart=no）随之停止，后端会 5432 拒连。
function Ensure-Database {
    Write-Host '[DB] 检查 WSL pgvector17 容器...'
    # WSL 可能刚被唤醒，dockerd 还没就绪：docker inspect 失败则重试，最多 30 秒
    $running = $null
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        $out = & wsl -d $WslDistro -- docker inspect -f '{{.State.Running}}' $PgContainer 2>$null
        if ($LASTEXITCODE -eq 0) { $running = "$out".Trim(); break }
        Start-Sleep -Seconds 2
    }
    if ($running -ne 'true') {
        Write-Host '[DB] 容器未运行，执行 docker start...'
        & wsl -d $WslDistro -- docker start $PgContainer | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "docker start $PgContainer 失败" }
    } else {
        Write-Host '[DB] 容器已在运行'
    }

    # 保活会话：没有则以隐藏窗口挂一个常驻 WSL 会话，防止空闲回收
    $kept = "$(& wsl -d $WslDistro -- sh -c "pgrep -f 'sleep infinity' >/dev/null 2>&1 && echo yes || echo no")".Trim()
    if ($kept -ne 'yes') {
        Write-Host '[DB] 挂载 WSL 保活会话（sleep infinity）'
        Start-Process wsl.exe -ArgumentList @('-d', $WslDistro, '--', 'sh', '-c', 'sleep infinity') -WindowStyle Hidden
    }

    # pg_isready 重试 15 秒
    $deadline = (Get-Date).AddSeconds(15)
    while ((Get-Date) -lt $deadline) {
        & wsl -d $WslDistro -- docker exec $PgContainer pg_isready -U postgres 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-Host '[DB] PostgreSQL 就绪'; return }
        Start-Sleep -Seconds 1
    }
    throw 'pg_isready 超时：PostgreSQL 15 秒内未就绪'
}

# ---------------- 后端 ----------------

function Start-Backend {
    if ($NoBuild) {
        Write-Host '[BACKEND] 跳过打包（-NoBuild）'
        if (-not (Test-Path (Join-Path $BackendDir $BackendJar))) {
            throw "未找到 $BackendJar，请去掉 -NoBuild 先构建"
        }
    } else {
        if (-not (Test-Path $MvnCmd)) { $script:MvnCmd = 'mvn.cmd' }
        Write-Host '[BACKEND] mvn clean package ...'
        $env:JAVA_HOME = $JavaHome
        $env:PATH = "$JavaHome\bin;$env:PATH"
        Push-Location $BackendDir
        try {
            & $MvnCmd clean package
            if ($LASTEXITCODE -ne 0) { throw "mvn clean package 失败（exit $LASTEXITCODE），已中止启动" }
        } finally { Pop-Location }
    }

    Stop-ByPort -Port $BackendPort -Name '后端旧进程' | Out-Null

    Write-Host "[BACKEND] 启动 java（端口 $BackendPort，日志 app.log / app.err）"
    $proc = Start-Process -FilePath (Join-Path $JavaHome 'bin\java.exe') `
        -ArgumentList @('--enable-native-access=ALL-UNNAMED', '-jar', $BackendJar) `
        -WorkingDirectory $BackendDir `
        -RedirectStandardOutput $BackendLog -RedirectStandardError $BackendErr `
        -WindowStyle Hidden -PassThru
    if (Wait-PortUp -Port $BackendPort -TimeoutSec 90 -WatchPid $proc.Id -ErrFile $BackendErr) {
        Write-Host "[BACKEND] 就绪 http://localhost:$BackendPort（PID $($proc.Id)）"
    } else {
        throw "后端 90 秒内未监听 $BackendPort，启动失败"
    }
}

function Stop-Backend { Stop-ByPort -Port $BackendPort -Name '后端' | Out-Null }

# ---------------- 前端 ----------------

function Start-Frontend {
    if (-not (Test-Path (Join-Path $FrontendDir 'node_modules'))) {
        Write-Host '[FRONTEND] node_modules 缺失，先 npm install ...'
        Push-Location $FrontendDir
        try {
            & npm.cmd install
            if ($LASTEXITCODE -ne 0) { throw 'npm install 失败' }
        } finally { Pop-Location }
    }
    Stop-ByPort -Port $FrontendPort -Name '前端旧进程' | Out-Null

    Write-Host "[FRONTEND] 启动 Vite（端口 $FrontendPort，日志 vite.log / vite.err）"
    $proc = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'dev') `
        -WorkingDirectory $FrontendDir `
        -RedirectStandardOutput $FrontendLog -RedirectStandardError $FrontendErr `
        -WindowStyle Hidden -PassThru
    if (Wait-PortUp -Port $FrontendPort -TimeoutSec 60 -WatchPid $proc.Id -ErrFile $FrontendErr) {
        Write-Host "[FRONTEND] 就绪 http://localhost:$FrontendPort"
    } else {
        throw "前端 60 秒内未监听 $FrontendPort，启动失败"
    }
}

function Stop-Frontend { Stop-ByPort -Port $FrontendPort -Name '前端' | Out-Null }

# ---------------- 主流程 ----------------

$wantBackend  = ($Service -eq 'all') -or ($Service -eq 'backend')
$wantFrontend = ($Service -eq 'all') -or ($Service -eq 'frontend')

switch ($Action) {
    'stop' {
        if ($wantFrontend) { Stop-Frontend }
        if ($wantBackend)  { Stop-Backend }
        Write-Host '[DONE] 停止完成（数据库与 WSL 保活会话未动）'
    }
    'start' {
        if ($wantBackend) { Ensure-Database; Start-Backend }
        if ($wantFrontend) { Start-Frontend }
        Write-Host '[DONE] 启动完成'
    }
    'restart' {
        if ($wantFrontend) { Stop-Frontend }
        if ($wantBackend)  { Stop-Backend }
        if ($wantBackend) { Ensure-Database; Start-Backend }
        if ($wantFrontend) { Start-Frontend }
        Write-Host '[DONE] 重启完成'
    }
}
