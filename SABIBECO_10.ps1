$SiteName = $null
$CodeNM = $null
$ScanRanges = @()
$StaticIPs = @()

$SiteConfigs = @{
    "1" = @{ Site="BSG NINH THUAN";    CodeNM="NT-77C9D48E177535414FC805FF"; ScanRanges=@(); StaticIPs=@() }
    "2" = @{ Site="BSG PHU LY";        CodeNM="PL-7BA3DF7289959A03A2ACDF03"; ScanRanges=@(); StaticIPs=@() }
    "3" = @{ Site="NM BINH DUONG";     CodeNM="BD-C3687A972CB91B18CCAD167A"; ScanRanges=@(); StaticIPs=@() }
    "4" = @{ Site="NM DONG THAP";      CodeNM="DT-69EC881899064464BDEE46EA"; ScanRanges=@(); StaticIPs=@() }
    "5" = @{ Site="NM HOANG QUYNH";    CodeNM="HQ-D92357730AA423A8E4EB1869"; ScanRanges=@(); StaticIPs=@() }
    "6" = @{ Site="SABIBECO HO";       CodeNM="HO-79601340F79939ED2FA0B2F5"; ScanRanges=@(); StaticIPs=@() }
    "7" = @{ Site="TMDV BSG BINH TAY"; CodeNM="BT-62584DFDAF9F80D44D56A915"; ScanRanges=@(); StaticIPs=@() }
}

Clear-Host
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                 SABIBECO PING IPS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[1] BSG NINH THUAN"
Write-Host "[2] BSG PHU LY"
Write-Host "[3] NM BINH DUONG"
Write-Host "[4] NM DONG THAP"
Write-Host "[5] NM HOANG QUYNH"
Write-Host "[6] SABIBECO HO"
Write-Host "[7] TMDV BSG BINH TAY"
Write-Host ""

do {
    $SiteChoice = Read-Host "Select site [1-7]"
} until ($SiteConfigs.ContainsKey($SiteChoice))

$SelectedConfig = $SiteConfigs[$SiteChoice]
$SiteName = $SelectedConfig.Site
$CodeNM = $SelectedConfig.CodeNM
$ScanRanges = @($SelectedConfig.ScanRanges)
$StaticIPs = @($SelectedConfig.StaticIPs)

Write-Host ""
Write-Host "SITE   : $SiteName" -ForegroundColor Green
$confirm = Read-Host "Confirm this site? [Y/N]"
if ($confirm -notmatch '^[Yy]$') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "============= SCAN MODE =====================" -ForegroundColor Cyan
Write-Host "[1] AUTO - discover reachable local networks"
Write-Host "[2] PING LIST ONLY - monitor only IPs from ping_list.txt"
do {
    $ScanMode = Read-Host "Select [1-2]"
} until ($ScanMode -in @("1","2"))
$ScanModeName = if ($ScanMode -eq "2") { "PING LIST ONLY" } else { "AUTO" }

Write-Host ""
$SteadyCheckSec = 15
$PingModeName = "15 SECONDS"

Write-Host ""
Write-Host "============= DEVICE REFRESH ================" -ForegroundColor Cyan
Write-Host "[1] 60mins - 60 MIN refresh"
Write-Host "[2] 15mins - 15 MIN refresh"
do {
    $PlanChoice = Read-Host "Select [1-2]"
} until ($PlanChoice -in @("1","2"))

$InitialCloudSec = 30
Write-Host ""
$HeartbeatCloudSec = 120
# OfflineReminderSec follows DeviceRefreshSec; assigned after the menu
$OfflineReminderSec = 0  # placeholder, assigned after switch
switch ($PlanChoice) {
    "1" { $CloudMode = "60mins"; $CloudModeName = "60mins - 60 MINUTES"; $DeviceRefreshSec = 3600 }
    "2" { $CloudMode = "15mins"; $CloudModeName = "15mins - 15 MINUTES"; $DeviceRefreshSec = 900 }
}
# P1: Offline reminder follows the selected device refresh interval
$OfflineReminderSec = $DeviceRefreshSec

Write-Host ""
Write-Host "SITE      : $SiteName" -ForegroundColor Green
Write-Host "SCAN MODE : $ScanModeName" -ForegroundColor Green
Write-Host "PING      : $PingModeName" -ForegroundColor Green
Write-Host "DEVICE REFRESH : $([int]($DeviceRefreshSec / 60)) min (status changes are sent immediately)" -ForegroundColor Green
Write-Host "OFFLINE REMINDER: $([int]($OfflineReminderSec / 60)) min (repeat while device remains OFFLINE)" -ForegroundColor Green
Write-Host "HEARTBEAT       : $([int]($HeartbeatCloudSec / 60)) min (monitor health signal)" -ForegroundColor Green
Write-Host ""

$DesktopPath = [Environment]::GetFolderPath("Desktop")
if ([string]::IsNullOrWhiteSpace($DesktopPath)) {
    $DesktopPath = Join-Path $env:USERPROFILE "Desktop"
}

$LogFolder = Join-Path $DesktopPath ("${SiteName}_LOG" -replace " ","_")
if (-not (Test-Path $LogFolder)) {
    New-Item -ItemType Directory -Path $LogFolder -Force | Out-Null
}

$LogFile = Join-Path $LogFolder (("{0}_{1}.txt" -f ($SiteName -replace " ","_"), (Get-Date -Format "yyyy-MM-dd")))
$SavedIpFile             = Join-Path $LogFolder "ping_list.txt"
if ($ScanMode -eq "2") {
    Write-Host "PING LIST: $SavedIpFile" -ForegroundColor Cyan
    Write-Host "The existing ping_list.txt will be loaded automatically. No input is required." -ForegroundColor Green
}
$DailyDiscoveryStateFile = Join-Path $LogFolder "last_daily_discovery.txt"
$TranscriptStarted = $false
$EventLogFile = Join-Path $LogFolder (("{0}_{1}_EVENTS.txt" -f ($SiteName -replace " ","_"), (Get-Date -Format "yyyy-MM-dd")))

function Write-TroubleshootEvent([string]$Message) {
    try {
        $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
        Add-Content -Path $EventLogFile -Value $line -Encoding UTF8
    } catch {}
}

try {
    Start-Transcript -Path $LogFile -Append -Force | Out-Null
    $TranscriptStarted = $true
}
catch {
    Write-Host "WARNING: Could not start local log: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "LOCAL LOG : $LogFile" -ForegroundColor DarkGray

$Host.UI.RawUI.WindowTitle = $SiteName

$TenantId = "b060ef55-3a97-4911-a4c0-3b87464e996a"
$UserId   = "f3fa741f-3f79-4b68-9e69-8a69b5c6fb02"
$FormId   = "Ve9gsJc6EUmkwDuHRk6Zah90-vN5P2hLnmmKabXG-wJUNFQ5WDZGNVZHTVgwT0lYQURESFRWUzlQTS4u"

$SubmitUrl = "https://forms.cloud.microsoft/formapi/api/$TenantId/users/$UserId/forms('$FormId')/responses"

$Q_MAC      = "re7c475ba62cf4d5bba8c7aa1f7be698f"
$Q_Hostname = "r508df5347a944775ab3c63e89e18d064"
$Q_IP       = "r87a0153a2c24487ab4e61985cd154cca"
$Q_Status   = "r832477896cd54ee9b5f7aa6412fa680f"
$Q_Latency  = "r71625626efa946b985c09050ce3e58a1"
$Q_Network  = "rb75912fb47bb477797c546b023ac5b24"
$Q_Site     = "rf919c340d1a34d9f97e44691b90f9654"
$Q_CodeNM   = "r364e5cfbed4d4ea2be2a3471030bef66"

$ConfirmGapSec    = 5
$DiscoverySec     = 300
$LatencyAlertMs   = 100
$SlowConfirmCount = 4       # SLOW only after N consecutive slow pings (4 x 15 s = 1 min)
$SlowRecoverCount = 8       # back to ONLINE only after N consecutive good pings (8 x 15 s = 2 min) -> stops ONLINE<->SLOW flapping
$MinChangeGapSec  = 60      # one device: at most 1 status-change row per 60 s (the flow's duplicate check can need ~30 s to see the previous row)
$OfflineFailCount = 3
$PingTimeoutMs    = 1000
$PingBatchSize    = 500
$TrackAfterSec = 30

$DailyDiscoveryEnabled = $true

function Get-SavedPingIPs {
    if (-not (Test-Path $SavedIpFile)) {
        @(
            "# SAVED PING LIST"
            "# Add IPv4 addresses separated by spaces, commas, or new lines."
            "# Optional name: 192.168.1.1, Core-Switch"
            ""
            "# 192.168.1.1"
        ) | Set-Content -Path $SavedIpFile -Encoding UTF8
        Write-Host "[$SiteName] PING LIST CREATED | $SavedIpFile" -ForegroundColor Cyan
        Write-TroubleshootEvent "PING LIST CREATED | $SavedIpFile"
        return @()
    }

    $valid = New-Object System.Collections.Generic.List[string]
    foreach ($line in @(Get-Content -Path $SavedIpFile -ErrorAction SilentlyContinue)) {
        $t = ([string]$line).Trim()
        if (-not $t -or $t.StartsWith('#')) { continue }
        $matches = [regex]::Matches($t, '(?<![0-9.])(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?![0-9.])')
        foreach ($match in $matches) {
            $ip = $match.Value
            $parsed = $null
            if ([System.Net.IPAddress]::TryParse($ip, [ref]$parsed) -and
                $parsed.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
                -not $valid.Contains($ip)) {
                $valid.Add($ip)
            }
        }
    }
    return @($valid.ToArray())
}

function Get-SavedNameMap {
    $map = @{}
    if (-not (Test-Path $SavedIpFile)) { return $map }
    foreach ($line in @(Get-Content -Path $SavedIpFile -ErrorAction SilentlyContinue)) {
        $t = ([string]$line).Trim()
        if (-not $t -or $t.StartsWith('#')) { continue }
        if ($t -match '^\s*((?:[0-9]{1,3}\.){3}[0-9]{1,3})\s*[,;\t]\s*(.+)$') {
            $ipPart = $Matches[1]
            $namePart = $Matches[2].Trim()
            if ($namePart -and $namePart -notmatch '(?:[0-9]{1,3}\.){3}[0-9]{1,3}') {
                $parsed = $null
                if ([System.Net.IPAddress]::TryParse($ipPart, [ref]$parsed)) {
                    $map[$ipPart] = $namePart
                }
            }
        }
    }
    return $map
}

function Test-DailyDiscoveryDue {
    if (-not $DailyDiscoveryEnabled) { return $false }
    $today = Get-Date -Format "yyyy-MM-dd"
    $last = ""
    if (Test-Path $DailyDiscoveryStateFile) {
        $last = ([string](Get-Content $DailyDiscoveryStateFile -ErrorAction SilentlyContinue | Select-Object -First 1)).Trim()
    }
    return ($last -ne $today)
}

function Set-DailyDiscoveryDone {
    (Get-Date -Format "yyyy-MM-dd") | Set-Content -Path $DailyDiscoveryStateFile -Encoding ASCII
}

$SummarySec       = 60
$SuppressMaxSec   = 600
$MaxParallelSends = 12
$MaxPendingSends  = 500
$MaxDevicePending = 480
$MaxNewDevicePostsPerCycle = 8

$NetworkIssueMinDevices = 5
$NetworkIssueRatio      = 0.50
$LoopSuspectRatio       = 0.75
$AlertCooldownSec       = 300

$SendNetworkAlertsToCloud = $false

try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

$Headers = @{
    "Content-Type" = "application/json"
    "User-Agent"   = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    "Referer"      = "https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=$FormId"
    "Origin"       = "https://forms.cloud.microsoft"
}

function Get-ActiveIPv4Adapter {
    $routes = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
        Where-Object { $_.NextHop -ne "0.0.0.0" } |
        Sort-Object RouteMetric

    foreach ($route in $routes) {
        $ip = Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -notlike "169.254*" -and
                $_.IPAddress -ne "127.0.0.1"
            } |
            Select-Object -First 1

        if ($ip) {
            $adapter = Get-NetAdapter -InterfaceIndex $route.InterfaceIndex -ErrorAction SilentlyContinue
            return [PSCustomObject]@{
                IP             = $ip.IPAddress
                PrefixLength   = $ip.PrefixLength
                InterfaceAlias = $ip.InterfaceAlias
                Adapter        = $adapter
            }
        }
    }
    return $null
}

function Get-NetworkDisplay($NetInfo) {
    if (-not $NetInfo) { return "No Network" }

    $alias = $NetInfo.InterfaceAlias
    $adapter = $NetInfo.Adapter

    if (($adapter -and $adapter.PhysicalMediaType -match "802.11|Wireless|Native 802.11") -or
        $alias -match "Wi-Fi|WLAN|Wireless") {
        $type = "Wi-Fi"
    }
    elseif ($alias -match "VPN") {
        $type = "VPN"
    }
    else {
        $type = "LAN"
    }

    return "$type ($alias)"
}

function Get-DeviceName([string]$IP) {
    try {
        $entry = [System.Net.Dns]::GetHostEntry($IP)
        if ($entry.HostName) {
            return $entry.HostName
        }
    } catch {}
    return $IP
}

function Get-ActiveLocalIPv4 {
    try {
        $routes = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
            Where-Object { $_.NextHop -and $_.NextHop -ne "0.0.0.0" } |
            Sort-Object RouteMetric, InterfaceMetric

        foreach ($route in $routes) {
            $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.IPAddress -and
                    $_.IPAddress -notlike "169.254.*" -and
                    $_.IPAddress -ne "127.0.0.1"
                } |
                Select-Object -First 1

            if ($ip) { return [string]$ip.IPAddress }
        }

        $upAdapters = Get-NetAdapter -ErrorAction SilentlyContinue |
            Where-Object { $_.Status -eq "Up" }

        foreach ($adapter in $upAdapters) {
            $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $adapter.ifIndex -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.IPAddress -and
                    $_.IPAddress -notlike "169.254.*" -and
                    $_.IPAddress -ne "127.0.0.1"
                } |
                Select-Object -First 1

            if ($ip) { return [string]$ip.IPAddress }
        }
    }
    catch {}

    try {
        $cfg = Get-CimInstance Win32_NetworkAdapterConfiguration -ErrorAction SilentlyContinue |
            Where-Object { $_.IPEnabled -and $_.DefaultIPGateway } |
            Select-Object -First 1
        if ($cfg) {
            $ipv4 = @($cfg.IPAddress) |
                Where-Object { $_ -match '^\d{1,3}(\.\d{1,3}){3}$' -and $_ -notlike "169.254.*" } |
                Select-Object -First 1
            if ($ipv4) { return [string]$ipv4 }
        }
    }
    catch {}

    return $null
}

function Get-ValidIPv4Adapters {
    $result = @()
    $upAdapters = Get-NetAdapter -ErrorAction SilentlyContinue |
        Where-Object { $_.Status -eq "Up" }

    foreach ($adapter in $upAdapters) {
        $ips = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $adapter.ifIndex -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -and
                $_.IPAddress -notlike "169.254.*" -and
                $_.IPAddress -ne "127.0.0.1"
            }

        foreach ($ip in @($ips)) {
            $result += [PSCustomObject]@{
                IP             = [string]$ip.IPAddress
                PrefixLength   = [int]$ip.PrefixLength
                InterfaceAlias = [string]$ip.InterfaceAlias
                Adapter        = $adapter
            }
        }
    }

    return @($result)
}

function Convert-IPv4ToUInt32([string]$Address) {
    $bytes = [System.Net.IPAddress]::Parse($Address).GetAddressBytes()
    if ($bytes.Length -ne 4) { throw "Not IPv4" }
    return (([uint64]$bytes[0] -shl 24) -bor ([uint64]$bytes[1] -shl 16) -bor ([uint64]$bytes[2] -shl 8) -bor [uint64]$bytes[3])
}

function Convert-UInt32ToIPv4([uint64]$Number) {
    return "$(($Number -shr 24) -band 255).$(($Number -shr 16) -band 255).$(($Number -shr 8) -band 255).$($Number -band 255)"
}

function Get-DiscoveryTargets($NetInfo) {
    if ($ScanMode -eq "2") {
        $only = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
        foreach ($ip in @(Get-SavedPingIPs)) {
            if ($ip) { $null = $only.Add([string]$ip) }
        }
        Write-Host "[$SiteName] [PING LIST ONLY] Monitoring $($only.Count) saved IP address(es)." -ForegroundColor Cyan
        return @($only)
    }
    $found = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    $targets = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    $activeAdapters = @(Get-ValidIPv4Adapters)
    if ($activeAdapters.Count -eq 0) {
        Write-Host "[$SiteName] [AUTO] No active IPv4 adapter." -ForegroundColor Yellow
        return @()
    }

    $validInterfaces = @($activeAdapters | ForEach-Object { [int]$_.Adapter.ifIndex } | Select-Object -Unique)
    $networks = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($active in $activeAdapters) {
        $null = $networks.Add("$($active.IP)/$($active.PrefixLength)")
        $null = $found.Add([string]$active.IP)
    }

    $routes = @(Get-NetRoute -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.DestinationPrefix -ne '0.0.0.0/0' -and
            $_.InterfaceIndex -in $validInterfaces -and
            $_.DestinationPrefix -match '^\d{1,3}(\.\d{1,3}){3}/\d{1,2}$'
        })
    foreach ($route in $routes) {
        $cidr = [string]$route.DestinationPrefix
        $addr, $bitsText = $cidr.Split('/')
        $bits = [int]$bitsText
        $octets = $addr.Split('.')
        if ($octets.Count -ne 4) { continue }
        $isPrivate = ($octets[0] -eq '10') -or
                     ($octets[0] -eq '192' -and $octets[1] -eq '168') -or
                     ($octets[0] -eq '172' -and [int]$octets[1] -ge 16 -and [int]$octets[1] -le 31)
        if ($isPrivate -and $bits -ge 21 -and $bits -le 32) {
            $null = $networks.Add($cidr)
        }
    }

    # Optional, explicitly configured site ranges supplement automatically detected networks.
    # Only bounded IPv4 CIDRs are accepted; the default route is never expanded.
    foreach ($configuredRange in @($ScanRanges)) {
        $cidrText = ([string]$configuredRange).Trim()
        if ($cidrText -notmatch '^(\d{1,3}(?:\.\d{1,3}){3})/(\d{1,2})$') {
            Write-Host "[$SiteName] [AUTO] Skipped invalid ScanRanges entry: $cidrText" -ForegroundColor Yellow
            continue
        }
        $candidateIP = $matches[1]
        $candidateBits = [int]$matches[2]
        $parsedIP = $null
        if ($candidateBits -lt 21 -or $candidateBits -gt 32 -or
            -not [System.Net.IPAddress]::TryParse($candidateIP, [ref]$parsedIP) -or
            $parsedIP.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork -or
            $parsedIP.ToString() -ne $candidateIP) {
            Write-Host "[$SiteName] [AUTO] Skipped unsupported ScanRanges entry: $cidrText (supported: /21 to /32)" -ForegroundColor Yellow
            continue
        }
        $null = $networks.Add($cidrText)
    }

    foreach ($cidr in $networks) {
        try {
            $addr, $bitsText = $cidr.Split('/')
            $bits = [int]$bitsText
            if ($bits -lt 21 -or $bits -gt 32) { continue }
            $size = [uint64][math]::Pow(2, (32 - $bits))
            $base = (Convert-IPv4ToUInt32 $addr)
            $base = [uint64]([math]::Floor($base / $size) * $size)
            $start = if ($bits -le 30) { [uint64]1 } else { [uint64]0 }
            $end = if ($bits -le 30) { $size - 2 } else { $size - 1 }
            for ($i = $start; $i -le $end; $i++) {
                $null = $targets.Add((Convert-UInt32ToIPv4 ($base + $i)))
            }
        } catch { continue }
    }

    foreach ($interfaceId in $validInterfaces) {
        $neighbors = @(Get-NetNeighbor -AddressFamily IPv4 -InterfaceIndex $interfaceId -ErrorAction SilentlyContinue |
            Where-Object { $_.State -in @('Reachable','Stale','Delay','Probe','Permanent') })
        foreach ($neighbor in $neighbors) {
            $ip = [string]$neighbor.IPAddress
            if ($ip -match '^\d{1,3}(\.\d{1,3}){3}$' -and $ip -notmatch '^(127|169\.254|224\.|239\.|255\.)') {
                $null = $found.Add($ip)
            }
        }
    }

    Write-Host "[$SiteName] [AUTO] Discovering devices across available local networks..." -ForegroundColor DarkGray
    if ($targets.Count -gt 0) {
        $alive = Invoke-ParallelPing -IPs @($targets) -TimeoutMs 700 -BatchSize 254
        foreach ($ip in @($alive.Keys)) {
            if ($alive[$ip] -ge 0) { $null = $found.Add([string]$ip) }
        }
    }
    foreach ($ip in @(Get-SavedPingIPs)) {
        if ($ip) { $null = $found.Add([string]$ip) }
    }
    foreach ($ip in @($StaticIPs)) {
        if ($ip) { $null = $found.Add([string]$ip) }
    }
    Write-Host "[$SiteName] [AUTO] Found $($found.Count) responding or known device(s)." -ForegroundColor Green
    return @($found)
}

function Invoke-ParallelPing {
    param(
        [string[]]$IPs,
        [int]$TimeoutMs = 1000,
        [int]$BatchSize = 500
    )

    $results = @{}
    if (-not $IPs -or $IPs.Count -eq 0) { return $results }

    for ($i = 0; $i -lt $IPs.Count; $i += $BatchSize) {
        $end   = [math]::Min($i + $BatchSize, $IPs.Count) - 1
        $batch = @($IPs[$i..$end])
        $pings = New-Object System.Collections.ArrayList
        $tasks = New-Object System.Collections.ArrayList

        foreach ($ip in $batch) {
            $p = New-Object System.Net.NetworkInformation.Ping
            [void]$pings.Add($p)
            $task = $null
            try { $task = $p.SendPingAsync($ip, $TimeoutMs) } catch { $task = $null }
            [void]$tasks.Add([PSCustomObject]@{ IP = $ip; Task = $task })
        }

        foreach ($t in $tasks) {
            $results[$t.IP] = -1
            if ($null -eq $t.Task) { continue }
            try {
                $reply = $t.Task.Result
                if ($reply -and $reply.Status -eq [System.Net.NetworkInformation.IPStatus]::Success) {
                    $results[$t.IP] = [int]$reply.RoundtripTime
                }
            } catch {}
        }

        foreach ($p in $pings) { try { $p.Dispose() } catch {} }
    }

    return $results
}

function Resolve-DeviceNames {
    param(
        [string[]]$IPs,
        [int]$WaitMs = 3000
    )

    $out = @{}
    if (-not $IPs -or $IPs.Count -eq 0) { return $out }

    $tasks = @{}
    foreach ($ip in $IPs) {
        try { $tasks[$ip] = [System.Net.Dns]::GetHostEntryAsync($ip) } catch { $tasks[$ip] = $null }
    }

    $valid = @($tasks.Values | Where-Object { $_ })
    if ($valid.Count -gt 0) {
        try { [void][System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]$valid, $WaitMs) } catch {}
    }

    foreach ($ip in $IPs) {
        $name = $ip
        $t = $tasks[$ip]
        if ($null -eq $t) {
            $name = Get-DeviceName $ip
        }
        elseif ($t.IsCompleted -and -not $t.IsFaulted -and -not $t.IsCanceled) {
            try { if ($t.Result.HostName) { $name = $t.Result.HostName } } catch {}
        }
        $out[$ip] = $name
    }

    return $out
}

function Update-MacCache($NetInfo) {
    try {
        foreach ($n in @(Get-NetNeighbor -AddressFamily IPv4 -ErrorAction SilentlyContinue)) {
            $mac = [string]$n.LinkLayerAddress
            if ($mac -and $mac -ne "00-00-00-00-00-00" -and $mac -ne "FF-FF-FF-FF-FF-FF") {
                $MacCache[[string]$n.IPAddress] = $mac.ToUpper()
            }
        }
    } catch {}

    try {
        if ($NetInfo -and $NetInfo.IP -and $NetInfo.Adapter -and $NetInfo.Adapter.MacAddress) {
            $MacCache[[string]$NetInfo.IP] = ([string]$NetInfo.Adapter.MacAddress).ToUpper()
        }
    } catch {}
}

$SendScriptText = @'
param($Uri, $Headers, $Body)
$ErrorActionPreference = 'Stop'
Invoke-RestMethod -Uri $Uri -Method Post -Headers $Headers -Body $Body -TimeoutSec 10 | Out-Null
'@

$SendPool = [runspacefactory]::CreateRunspacePool(1, $MaxParallelSends)
$SendPool.Open()
$PendingSends = New-Object System.Collections.ArrayList

function New-FormsBody($Answers) {
    return (@{ answers = ($Answers | ConvertTo-Json -Compress) } | ConvertTo-Json -Compress)
}

function Add-FormsPost {
    param(
        [string]$Body,
        [string]$IP,
        [string]$OkText,
        [string]$Color,
        [string]$Kind     = "DEVICE",
        [int]   $Priority = 10
    )

    # All items in PendingSends have already started BeginInvoke.
    # Never dispose an in-flight request to make room: its server-side result is unknown.
    if ($PendingSends.Count -ge $MaxPendingSends -or
        ($Priority -ge 10 -and $PendingSends.Count -ge $MaxDevicePending)) {
        Write-Host "[$SiteName] [$(Get-Date -Format 'HH:mm:ss')] SEND QUEUE BUSY ($($PendingSends.Count)) - deferred $IP ($Kind)" -ForegroundColor DarkYellow
        return $false
    }

    $ps = [powershell]::Create()
    $ps.RunspacePool = $SendPool
    [void]$ps.AddScript($SendScriptText).AddArgument($SubmitUrl).AddArgument($Headers).AddArgument($Body)
    $handle = $ps.BeginInvoke()

    [void]$PendingSends.Add([PSCustomObject]@{
        PS       = $ps
        Handle   = $handle
        IP       = $IP
        OkText   = $OkText
        Color    = $Color
        Kind     = $Kind
        Priority = $Priority
        Time     = (Get-Date -Format 'HH:mm:ss')
    })
    return $true
}

function Receive-PendingSends {
    foreach ($item in @($PendingSends)) {
        if (-not $item.Handle.IsCompleted) { continue }

        $err = $null
        try {
            [void]$item.PS.EndInvoke($item.Handle)
            if ($item.PS.Streams.Error.Count -gt 0) { $err = [string]$item.PS.Streams.Error[0] }
        }
        catch { $err = $_.Exception.Message }

        try { $item.PS.Dispose() } catch {}
        $PendingSends.Remove($item)

        if ($err) {
            Write-Host "[$SiteName] [$($item.Time)] SEND ERROR | $($item.IP) | $err" -ForegroundColor Red
            if ($item.Kind -eq "DEVICE" -and $Devices.ContainsKey([string]$item.IP)) {
                $Devices[[string]$item.IP].LastSentStatus = "NONE"
                $script:RegistryDirty = $true
            }
        }
        else {
            Write-Host "[$SiteName] [$($item.Time)] $($item.OkText)" -ForegroundColor $item.Color
        }
    }
}

function Get-TargetMac {
    param([Parameter(Mandatory=$true)][string]$IP)

    try {
        Test-Connection -ComputerName $IP -Count 1 -Quiet -ErrorAction SilentlyContinue | Out-Null

        $neighbor = Get-NetNeighbor -AddressFamily IPv4 -IPAddress $IP -ErrorAction SilentlyContinue |
            Where-Object {
                $_.LinkLayerAddress -and
                $_.LinkLayerAddress -ne "00-00-00-00-00-00" -and
                $_.LinkLayerAddress -ne "FF-FF-FF-FF-FF-FF"
            } |
            Select-Object -First 1

        if ($neighbor) {
            return [string]$neighbor.LinkLayerAddress
        }
    }
    catch {}

    return "N/A"
}

function Send-ToForms(
    [string]$DeviceName,
    [string]$IP,
    [string]$Status,
    [string]$Latency,
    [string]$Network,
    [string]$Color,
    [int]   $Priority = 10
) {
    $MacAddress = if ($MacCache.ContainsKey($IP)) { $MacCache[$IP] } else { "N/A" }

    $answers = @(
        @{ questionId = $Q_MAC;      answer1 = $MacAddress },
        @{ questionId = $Q_CodeNM;   answer1 = $CodeNM },
        @{ questionId = $Q_Site;     answer1 = $SiteName },
        @{ questionId = $Q_Hostname; answer1 = $DeviceName },
        @{ questionId = $Q_IP;       answer1 = $IP },
        @{ questionId = $Q_Status;   answer1 = $Status },
        @{ questionId = $Q_Latency;  answer1 = $Latency },
        @{ questionId = $Q_Network;  answer1 = $Network }
    )

    return (Add-FormsPost `
        -Body     (New-FormsBody $answers) `
        -IP       $IP `
        -OkText   "SENT | $DeviceName | $IP | $Status | ${Latency}ms" `
        -Color    $Color `
        -Priority $Priority)
}

function Send-NetworkAlert(
    [string]$AlertStatus,
    [string]$Message,
    [string]$Network
) {
    Write-TroubleshootEvent "$AlertStatus | $Network | $Message"

    if (-not $SendNetworkAlertsToCloud) {
        return $true
    }

    $FormHostname = "NETWORK"
    $NetInfo = Get-ActiveIPv4Adapter
    $localIP = if ($NetInfo) { $NetInfo.IP } else { "0.0.0.0" }

    $LocalMac = "N/A"
    try {
        if ($NetInfo -and $NetInfo.Adapter -and $NetInfo.Adapter.ifIndex) {
            $adapter = Get-NetAdapter -InterfaceIndex $NetInfo.Adapter.ifIndex -ErrorAction SilentlyContinue
            if ($adapter -and $adapter.MacAddress) { $LocalMac = $adapter.MacAddress.ToUpper() }
        }
    } catch {}

    $answers = @(
        @{ questionId = $Q_MAC;      answer1 = $LocalMac },
        @{ questionId = $Q_CodeNM;   answer1 = $CodeNM },
        @{ questionId = $Q_Site;     answer1 = $SiteName },
        @{ questionId = $Q_Hostname; answer1 = $FormHostname },
        @{ questionId = $Q_IP;       answer1 = $localIP },
        @{ questionId = $Q_Status;   answer1 = $AlertStatus },
        @{ questionId = $Q_Latency;  answer1 = "0" },
        @{ questionId = $Q_Network;  answer1 = "$Network | $Message" }
    )

    return (Add-FormsPost `
        -Body (New-FormsBody $answers) `
        -IP $localIP `
        -OkText "ALERT SENT | $AlertStatus | $Message" `
        -Color "Red" `
        -Kind "ALERT")
}

function Send-SiteSummary(
    [string]$SummaryStatus,
    [string]$Message,
    [string]$Network
) {
    $NetInfo = Get-ActiveIPv4Adapter
    $localIP = if ($NetInfo) { $NetInfo.IP } else { "0.0.0.0" }
    $LocalMac = "N/A"
    try {
        if ($NetInfo -and $NetInfo.Adapter -and $NetInfo.Adapter.MacAddress) { $LocalMac = ([string]$NetInfo.Adapter.MacAddress).ToUpper() }
    } catch {}

    if ($Message.Length -gt 900) { $Message = $Message.Substring(0, 900) + "..." }

    $answers = @(
        @{ questionId = $Q_MAC;      answer1 = $LocalMac },
        @{ questionId = $Q_CodeNM;   answer1 = $CodeNM },
        @{ questionId = $Q_Site;     answer1 = $SiteName },
        @{ questionId = $Q_Hostname; answer1 = "MONITOR" },
        @{ questionId = $Q_IP;       answer1 = $localIP },
        @{ questionId = $Q_Status;   answer1 = $SummaryStatus },
        @{ questionId = $Q_Latency;  answer1 = "0" },
        @{ questionId = $Q_Network;  answer1 = "$Network | $Message" }
    )

    return (Add-FormsPost `
        -Body (New-FormsBody $answers) `
        -IP $localIP `
        -OkText "$SummaryStatus | $Message" `
        -Color "DarkCyan")
}

function Send-MonitorHeartbeat([string]$Network, [string]$State = "MONITOR") {
    $NetInfo  = Get-ActiveIPv4Adapter
    $localIP  = if ($NetInfo) { $NetInfo.IP } else { "0.0.0.0" }
    $LocalMac = "N/A"
    try {
        if ($NetInfo -and $NetInfo.Adapter -and $NetInfo.Adapter.MacAddress) {
            $LocalMac = ([string]$NetInfo.Adapter.MacAddress).ToUpper()
        }
    } catch {}

    $netText = "HEARTBEAT: $([int]($HeartbeatCloudSec / 60)) min | DEVICE REFRESH: $([int]($DeviceRefreshSec / 60)) min"

    $answers = @(
        @{ questionId = $Q_MAC;      answer1 = $LocalMac },
        @{ questionId = $Q_CodeNM;   answer1 = $CodeNM },
        @{ questionId = $Q_Site;     answer1 = $SiteName },
        @{ questionId = $Q_Hostname; answer1 = "MONITOR" },
        @{ questionId = $Q_IP;       answer1 = $localIP },
        @{ questionId = $Q_Status;   answer1 = $State },
        @{ questionId = $Q_Latency;  answer1 = "0" },
        @{ questionId = $Q_Network;  answer1 = $netText }
    )

    return (Add-FormsPost `
        -Body     (New-FormsBody $answers) `
        -IP       $localIP `
        -OkText   "HEARTBEAT | $State | $SiteName | $localIP" `
        -Color    "DarkCyan" `
        -Kind     "HEARTBEAT" `
        -Priority 1)
}

function Test-ShouldSendDevice {
    param(
        [string]$Status, [string]$LastSentStatus, $FirstSeen, $LastSent,
        [datetime]$Now, [datetime]$ScriptStart,
        [string]$Mode, [int]$InitialSec, [int]$RefreshSec, [int]$OfflineReminderSec,
        [bool]$Suppress,
        [double]$MinChangeGapSec = 0
    )
    if ($Status -eq "PENDING") { return $false }

    $neverSent = ($LastSentStatus -eq "NONE")
    $changed   = ($Status -ne $LastSentStatus)

    if ($neverSent) {
        $ref = if ($FirstSeen) { [datetime]$FirstSeen } else { $ScriptStart }
        if (($Now - $ref).TotalSeconds -lt $InitialSec) { return $false }
        # Re-send after a failed/uncertain send (status was reset to NONE): wait the minimum gap too, so a
        # row that actually reached the flow is already visible there and gets UPDATED instead of added twice.
        if ($MinChangeGapSec -gt 0 -and $LastSent -and ([datetime]$LastSent) -gt [datetime]::MinValue -and (($Now - [datetime]$LastSent).TotalSeconds -lt $MinChangeGapSec)) { return $false }
        return $true
    }

    if ($Suppress -and -not $changed) { return $false }
    if ($changed) {
        # Same device changed again very soon after the last row: hold it (re-evaluated next cycle).
        if ($MinChangeGapSec -gt 0 -and $LastSent -and (($Now - [datetime]$LastSent).TotalSeconds -lt $MinChangeGapSec)) { return $false }
        return $true
    }

    $interval = if ($Status -eq "OFFLINE") { $OfflineReminderSec } else { $RefreshSec }
    $age = if ($LastSent) { ($Now - [datetime]$LastSent).TotalSeconds } else { [double]::MaxValue }
    return ($age -ge $interval)
}

function Get-SummaryText([string]$Prefix) {
    $tracked = @($Devices.Values | Where-Object { $_.Tracked })
    $on  = @($tracked | Where-Object { $_.Status -eq "ONLINE" }).Count
    $slw = @($tracked | Where-Object { $_.Status -eq "SLOW" }).Count
    $off = @($tracked | Where-Object { $_.Status -eq "OFFLINE" })
    $offText = (@($off | Sort-Object IP | ForEach-Object { "$($_.Name)($($_.IP))" }) -join ", ")
    $msg = "$Prefix Online=$on; Slow=$slw; Offline=$($off.Count)"
    if ($off.Count -gt 0) { $msg += " | OFFLINE: $offText" }
    return $msg
}

Write-Host "Discovery : every $([math]::Round($DiscoverySec/60)) min" -ForegroundColor DarkGray

$Devices = @{}
$RegistryFile = Join-Path $LogFolder $(if ($ScanMode -eq "2") { "known_devices_static.json" } else { "known_devices.json" })
$RegistryDirty = $false

function New-DeviceRecord([string]$IP, [string]$Name, [bool]$Tracked) {
    return [PSCustomObject]@{
        IP             = $IP
        Name           = $Name
        Tracked        = $Tracked
        FirstSeen      = $null
        LastSeen       = $null
        FailCount      = 0
        SlowCount      = 0
        GoodCount      = 0
        Latency        = "0"
        Status         = "PENDING"
        LastSentStatus = "NONE"
        LastSent       = [datetime]::MinValue
        OfflineSince   = $null
    }
}

function Get-ValidIdentityMac([string]$IP) {
    if (-not $MacCache.ContainsKey($IP)) { return $null }
    $mac = ([string]$MacCache[$IP]).Trim().ToUpperInvariant().Replace(':', '-')
    if ($mac -notmatch '^[0-9A-F]{2}(-[0-9A-F]{2}){5}$') { return $null }
    if ($mac -in @('00-00-00-00-00-00', 'FF-FF-FF-FF-FF-FF')) { return $null }
    $first = [Convert]::ToInt32($mac.Substring(0, 2), 16)
    # Multicast and locally administered MACs are not safe automatic identities.
    if (($first -band 3) -ne 0) { return $null }
    return $mac
}

function Merge-ChangedDeviceIPs {
    if ($ScanMode -eq '2') { return }
    # Only reconcile one old OFFLINE record with one newly ONLINE record.
    # Never merge ambiguous MACs or two currently active IPs.
    $byMac = @{}
    foreach ($ip in @($Devices.Keys)) {
        $d = $Devices[$ip]
        if (-not $d.Tracked) { continue }
        $mac = Get-ValidIdentityMac ([string]$ip)
        if (-not $mac) { continue }
        if (-not $byMac.ContainsKey($mac)) { $byMac[$mac] = New-Object System.Collections.ArrayList }
        [void]$byMac[$mac].Add([string]$ip)
    }
    foreach ($mac in @($byMac.Keys)) {
        $ips = @($byMac[$mac])
        if ($ips.Count -ne 2) { continue }
        $old = @($ips | Where-Object { $Devices[$_].Status -eq 'OFFLINE' })
        $new = @($ips | Where-Object { $Devices[$_].Status -in @('ONLINE', 'SLOW') })
        if ($old.Count -ne 1 -or $new.Count -ne 1) { continue }
        $oldIP = [string]$old[0]
        $newIP = [string]$new[0]
        # Do not merge if either address is explicitly configured for monitoring.
        if (@($StaticIPs) -contains $oldIP -or @($StaticIPs) -contains $newIP) { continue }
        $oldDevice = $Devices[$oldIP]
        $newDevice = $Devices[$newIP]
        if ($newDevice.Name -eq $newIP -and $oldDevice.Name -ne $oldIP) {
            $newDevice.Name = $oldDevice.Name
        }
        # New IP must still be sent to the existing IP-keyed Flow/Excel table.
        # Keep new record's Cloud state; do not copy LastSentStatus or LastSent.
        $Devices.Remove($oldIP)
        $MacCache.Remove($oldIP)
        $script:RegistryDirty = $true
        Write-Host "[$SiteName] [$(Get-Date -Format 'HH:mm:ss')] DHCP IP CHANGE | $oldIP -> $newIP | MAC=$mac" -ForegroundColor Cyan
        Write-TroubleshootEvent "DHCP IP CHANGE | $oldIP -> $newIP | MAC=$mac"
    }
}

function Save-Registry {
    try {
        $list = @()
        foreach ($d in @($Devices.Values | Where-Object { $_.Tracked })) {
            $mac = "N/A"
            if ($MacCache.ContainsKey($d.IP)) { $mac = $MacCache[$d.IP] }
            $sentTime = $null
            if ($d.LastSent -and ([datetime]$d.LastSent) -gt [datetime]::MinValue) {
                $sentTime = ([datetime]$d.LastSent).ToString('o')
            }
            $list += [PSCustomObject]@{
                IP = $d.IP; Name = $d.Name; Mac = $mac
                Sent = $d.LastSentStatus; LastSent = $sentTime
            }
        }
        $tempFile = "$RegistryFile.tmp"
        ConvertTo-Json -InputObject @($list) -Depth 5 | Set-Content -LiteralPath $tempFile -Encoding UTF8 -ErrorAction Stop
        Move-Item -LiteralPath $tempFile -Destination $RegistryFile -Force -ErrorAction Stop
        return $true
    } catch {
        Write-Host "[$SiteName] Registry save failed: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

function Import-Registry {
    if (-not (Test-Path -LiteralPath $RegistryFile)) { return }
    try {
        $raw = Get-Content -LiteralPath $RegistryFile -Raw -ErrorAction Stop
        $parsedItems = ConvertFrom-Json -InputObject $raw -ErrorAction Stop
        $items = @($parsedItems)
        $flattened = New-Object System.Collections.ArrayList
        foreach ($entry in $items) {
            if ($entry -is [array]) {
                foreach ($nested in $entry) { [void]$flattened.Add($nested) }
            } else { [void]$flattened.Add($entry) }
        }
        $recovered = 0
        $invalid = 0
        foreach ($it in $flattened) {
            if ($null -eq $it) { continue }
            $rawIP = ([string]$it.IP).Trim()
            $ips = @([regex]::Matches($rawIP, '(?<![0-9.])(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?![0-9.])') | ForEach-Object { $_.Value } | Select-Object -Unique)
            if ($ips.Count -eq 0) { $invalid++; continue }
            if ($ips.Count -gt 1 -or $rawIP -ne $ips[0]) { $recovered++ }
            foreach ($ip in $ips) {
                $addr = $null
                if (-not [System.Net.IPAddress]::TryParse($ip, [ref]$addr) -or
                    $addr.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork -or
                    $addr.ToString() -ne $ip) { $invalid++; continue }
                if ($Devices.ContainsKey($ip)) { continue }
                $name = if ($it.Name) { ([string]$it.Name).Trim() } else { $ip }
                $nameIPs = @([regex]::Matches($name, '(?<![0-9.])(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?![0-9.])'))
                if ($nameIPs.Count -gt 1 -or $name.Length -gt 120 -or $ips.Count -gt 1) { $name = $ip }
                $rec = New-DeviceRecord $ip $name $true
                # Older registry files have no LastSent; safely resync those entries.
                $savedTime = [datetime]::MinValue
                $savedStatus = ([string]$it.Sent).Trim().ToUpperInvariant()
                if ($savedStatus -in @('ONLINE', 'OFFLINE', 'SLOW') -and $it.LastSent) {
                    $parsedTime = [datetime]::MinValue
                    if ([datetime]::TryParse([string]$it.LastSent, [ref]$parsedTime) -and
                        $parsedTime -le (Get-Date).AddMinutes(2) -and
                        $parsedTime -gt (Get-Date).AddDays(-30)) {
                        $savedTime = $parsedTime
                        $rec.LastSentStatus = $savedStatus
                    }
                }
                $rec.LastSent = $savedTime
                $Devices[$ip] = $rec
                if ($ips.Count -eq 1 -and $it.Mac -and $it.Mac -ne 'N/A') { $MacCache[$ip] = [string]$it.Mac }
            }
        }
        if ($recovered -gt 0 -or $invalid -gt 0) {
            $backup = Join-Path $LogFolder ("known_devices_recovery_backup_{0}.json" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))
            Copy-Item -LiteralPath $RegistryFile -Destination $backup -ErrorAction Stop
            Write-Host "[$SiteName] Recovered legacy entries; backup saved." -ForegroundColor Yellow
        }
        $script:RegistryDirty = $true
        Write-Host "[$SiteName] Known devices: $($Devices.Count)" -ForegroundColor DarkGray
    } catch {
        Write-Host "[$SiteName] Could not read known_devices.json: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

$MacCache = @{}
$LastDiscovery = [datetime]::MinValue
$LastNetworkAlert = [datetime]::MinValue
$PreviousNetworkState = "ONLINE"
$NetIssueSince = $null
$LastSummary   = [datetime]::MinValue
$LastHeartbeat      = [datetime]::MinValue
$FirstHeartbeatSent = $false

$script:NextHeartbeat = Get-Date

function Invoke-HeartbeatIfDue {
    if ((Get-Date) -lt $script:NextHeartbeat) { return }
    $script:NextHeartbeat = (Get-Date).AddSeconds($HeartbeatCloudSec)
    try {
        $network = Get-NetworkDisplay (Get-ActiveIPv4Adapter)
        if (Send-MonitorHeartbeat -Network $network -State "MONITOR ALIVE") {
            Write-TroubleshootEvent "HEARTBEAT QUEUED | $SiteName"
        } else {
            $script:NextHeartbeat = (Get-Date).AddSeconds(15)
        }
    } catch {
        Write-TroubleshootEvent "HEARTBEAT ERROR | $($_.Exception.Message)"
        $script:NextHeartbeat = (Get-Date).AddSeconds(15)
    }
}

$ScriptStart   = Get-Date
$CheckSec      = $SteadyCheckSec
$EstimateShown = $false

Import-Registry

try {
while ($true) {
    Invoke-HeartbeatIfDue
    if (Test-DailyDiscoveryDue) {
        Write-Host "[$SiteName] [$(Get-Date -Format 'HH:mm:ss')] DAILY DISCOVERY | New day detected; rerunning the selected scan mode." -ForegroundColor Cyan
        Write-TroubleshootEvent "DAILY DISCOVERY | New day detected | Mode=$ScanModeName"
        $lastDiscovery = [datetime]::MinValue
        Set-DailyDiscoveryDone
    }

    $cycleStart = Get-Date
    try {
        Receive-PendingSends

        $NetInfo = Get-ActiveIPv4Adapter

        if (-not $NetInfo) {
            Write-Host "[$SiteName] [$(Get-Date -Format 'HH:mm:ss')] No active IPv4 network connection found." -ForegroundColor Red
            Start-Sleep -Seconds $CheckSec
            continue
        }

        $NetworkDisplay = Get-NetworkDisplay $NetInfo

        if ($LastDiscovery -eq [datetime]::MinValue -or ((Get-Date) - $LastDiscovery).TotalSeconds -ge $DiscoverySec) {
            $newTargets = @(Get-DiscoveryTargets $NetInfo)
            if ($ScanMode -eq "2") {
                $allowed = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
                foreach ($target in $newTargets) { $null = $allowed.Add([string]$target) }
                foreach ($oldIP in @($Devices.Keys)) {
                    if (-not $allowed.Contains([string]$oldIP)) {
                        $Devices.Remove($oldIP)
                        $script:RegistryDirty = $true
                    }
                }
            }
            $NameMap = Get-SavedNameMap

            $needName = @($newTargets | Where-Object {
                -not $NameMap.ContainsKey($_) -and (-not $Devices.ContainsKey($_) -or $Devices[$_].Name -eq $_)
            })
            $names = @{}
            if ($needName.Count -gt 0) { $names = Resolve-DeviceNames -IPs $needName }

            foreach ($ip in $newTargets) {
                if (-not $Devices.ContainsKey($ip)) {
                    $isStatic = (@($StaticIPs) -contains $ip)
                    $nm = $ip
                    if ($NameMap.ContainsKey($ip)) { $nm = $NameMap[$ip] }
                    elseif ($names.ContainsKey($ip)) { $nm = $names[$ip] }
                    $Devices[$ip] = New-DeviceRecord $ip $nm $isStatic
                }
                else {
                    $newName = $null
                    if ($NameMap.ContainsKey($ip)) { $newName = $NameMap[$ip] }
                    elseif ($names.ContainsKey($ip) -and $names[$ip] -ne $ip) { $newName = $names[$ip] }
                    if ($newName -and $newName -ne $Devices[$ip].Name) {
                        $Devices[$ip].Name = $newName
                        # A hostname change is metadata, not a new device status.
                        # Keep the cloud refresh schedule instead of forcing a new Forms response.
                        $script:RegistryDirty = $true
                    }
                }
            }

            foreach ($sip in $(if ($ScanMode -eq "2") { @() } else { @($StaticIPs) })) {
                if ($sip -and -not $Devices.ContainsKey([string]$sip)) {
                    $Devices[[string]$sip] = New-DeviceRecord ([string]$sip) ([string]$sip) $true
                }
            }

            $LastDiscovery = Get-Date
        }

        $ipList = @($Devices.Keys | Sort-Object)
        $pingResults = Invoke-ParallelPing -IPs $ipList -TimeoutMs $PingTimeoutMs -BatchSize $PingBatchSize

        $failed = @($ipList | Where-Object { $pingResults[$_] -lt 0 })
        for ($attempt = 2; $attempt -le $OfflineFailCount -and $failed.Count -gt 0; $attempt++) {
            Start-Sleep -Seconds $ConfirmGapSec
            $retry = Invoke-ParallelPing -IPs $failed -TimeoutMs $PingTimeoutMs -BatchSize $PingBatchSize
            foreach ($fip in $failed) {
                if ($retry[$fip] -ge 0) { $pingResults[$fip] = $retry[$fip] }
            }
            $failed = @($failed | Where-Object { $pingResults[$_] -lt 0 })
        }

        Update-MacCache $NetInfo

        $now = Get-Date
        $CycleTotal = 0
        $CycleSlow  = 0
        $CycleFail  = 0
        $CycleOnline = 0
        $Candidates = 0

        foreach ($ip in $ipList) {
            $d = $Devices[$ip]
            $rtt = $pingResults[$ip]
            $prevStatus = $d.Status

            if ($null -ne $rtt -and $rtt -ge 0) {
                $ms = [int]$rtt
                $d.FailCount = 0
                $d.OfflineSince = $null
                $d.LastSeen = $now
                if (-not $d.FirstSeen) { $d.FirstSeen = $now }

                if ($ms -gt $LatencyAlertMs) { $d.SlowCount++; $d.GoodCount = 0 } else { $d.GoodCount++; $d.SlowCount = 0 }
                if ($d.Status -eq "SLOW") {
                    # leave SLOW only after several good pings in a row (hysteresis)
                    $d.Status = if ($d.GoodCount -ge $SlowRecoverCount) { "ONLINE" } else { "SLOW" }
                }
                else {
                    $d.Status = if ($d.SlowCount -ge $SlowConfirmCount) { "SLOW" } else { "ONLINE" }
                }
                $d.Latency = [string]$ms

                if (-not $d.Tracked -and (($now - $d.FirstSeen).TotalSeconds -ge $TrackAfterSec)) {
                    $d.Tracked = $true
                    $script:RegistryDirty = $true
                    Write-Host "[$SiteName] [$(Get-Date -Format 'HH:mm:ss')] NEW DEVICE TRACKED | $($d.Name) | $ip" -ForegroundColor Cyan
                    Write-TroubleshootEvent "NEW | $($d.Name) | $ip"

                }
            }
            else {
                $d.FailCount = $OfflineFailCount
                $d.SlowCount = 0
                $d.GoodCount = 0
                $d.Latency = "0"

                if (-not $d.Tracked) {
                    $Devices.Remove($ip)
                    continue
                }
                $d.Status = "OFFLINE"
                if (-not $d.OfflineSince) { $d.OfflineSince = $now }
            }

            if (-not $d.Tracked) { $Candidates++; continue }

            if ($d.Status -ne $prevStatus -and $d.Status -ne "PENDING") {
                if ($d.Status -eq "OFFLINE") {
                    Write-Host "[$SiteName] [$(Get-Date -Format 'HH:mm:ss')] OFFLINE | $($d.Name) | $ip | $OfflineFailCount/$OfflineFailCount failed" -ForegroundColor Red
                    Write-TroubleshootEvent "OFFLINE | $($d.Name) | $ip | $OfflineFailCount/$OfflineFailCount failed"
                }
                elseif ($d.Status -eq "ONLINE" -and $prevStatus -eq "OFFLINE") {
                    Write-Host "[$SiteName] [$(Get-Date -Format 'HH:mm:ss')] RECOVERED | $($d.Name) | $ip | $($d.Latency)ms" -ForegroundColor Green
                    Write-TroubleshootEvent "RECOVERED | $($d.Name) | $ip | $($d.Latency)ms"
                }
                elseif ($d.Status -eq "SLOW") {
                    Write-Host "[$SiteName] [$(Get-Date -Format 'HH:mm:ss')] SLOW | $($d.Name) | $ip | $($d.Latency)ms" -ForegroundColor Yellow
                    Write-TroubleshootEvent "SLOW | $($d.Name) | $ip | $($d.Latency)ms"
                }
            }

            if ($d.Status -ne "PENDING") {
                $CycleTotal++
                if ($d.Status -eq "SLOW")    { $CycleSlow++ }
                if ($d.Status -eq "OFFLINE") { $CycleFail++ }
                if ($d.Status -eq "ONLINE")  { $CycleOnline++ }
            }
        }

        Merge-ChangedDeviceIPs
        # Recalculate counts after removing an old IP record.
        $trackedNow = @($Devices.Values | Where-Object { $_.Tracked -and $_.Status -ne 'PENDING' })
        $CycleTotal = $trackedNow.Count
        $CycleOnline = @($trackedNow | Where-Object { $_.Status -eq 'ONLINE' }).Count
        $CycleSlow = @($trackedNow | Where-Object { $_.Status -eq 'SLOW' }).Count
        $CycleFail = @($trackedNow | Where-Object { $_.Status -eq 'OFFLINE' }).Count

        Write-Host "[$SiteName] [$(Get-Date -Format 'HH:mm:ss')] CYCLE | tracked=$CycleTotal online=$CycleOnline slow=$CycleSlow offline=$CycleFail candidates=$Candidates | next check in ${CheckSec}s" -ForegroundColor DarkGray
        Write-TroubleshootEvent "CYCLE | tracked=$CycleTotal online=$CycleOnline slow=$CycleSlow offline=$CycleFail candidates=$Candidates"

        if (-not $EstimateShown -and $CycleTotal -gt 0) {
            $EstimateShown = $true
            $hbPerDay = [math]::Round(86400 / $HeartbeatCloudSec)
            # P2: Both modes use their selected refresh interval without double-counting devices
            $devPerDay = $CycleTotal * [math]::Round(86400 / $DeviceRefreshSec)
            Write-Host "[$SiteName] ESTIMATE | about $($hbPerDay + $devPerDay) cloud rows/day for this site ($CycleTotal devices, $CloudMode). Each row triggers one flow run of approximately 3-4 actions." -ForegroundColor DarkYellow
            Write-TroubleshootEvent "ESTIMATE | rows/day this site = $($hbPerDay + $devPerDay) | devices=$CycleTotal | mode=$CloudMode"
        }

        $networkState = "ONLINE"
        if ($CycleTotal -ge $NetworkIssueMinDevices) {
            $badRatio = ($CycleSlow + $CycleFail) / $CycleTotal
            if     ($badRatio -ge $LoopSuspectRatio)   { $networkState = "LOOP SUSPECTED" }
            elseif ($badRatio -ge $NetworkIssueRatio)  { $networkState = "NETWORK ISSUE" }
        }

        if ($networkState -ne "ONLINE") {
            if (-not $NetIssueSince) { $NetIssueSince = Get-Date }
        }
        else { $NetIssueSince = $null }

        $suppress = ($NetIssueSince -and (((Get-Date) - $NetIssueSince).TotalSeconds -lt $SuppressMaxSec))

        $newDevicePostsThisCycle = 0
        foreach ($ip in @($Devices.Keys | Sort-Object)) {
            $d = $Devices[$ip]
            if (-not $d.Tracked -or $d.Status -eq "PENDING") { continue }

            $shouldSend = Test-ShouldSendDevice -Status $d.Status -LastSentStatus $d.LastSentStatus `
                -FirstSeen $d.FirstSeen -LastSent $d.LastSent -Now (Get-Date) -ScriptStart $ScriptStart `
                -Mode $CloudMode -InitialSec $InitialCloudSec -RefreshSec $DeviceRefreshSec `
                -OfflineReminderSec $OfflineReminderSec -Suppress ([bool]$suppress) `
                -MinChangeGapSec $MinChangeGapSec
            if (-not $shouldSend) { continue }

            $color    = if ($d.Status -eq "ONLINE") { "Green" } elseif ($d.Status -eq "SLOW") { "Yellow" } else { "Red" }
            $isNewDevice = ($d.LastSentStatus -eq "NONE")
            $isChange = ($d.Status -ne $d.LastSentStatus -and -not $isNewDevice)
            # Spread initial/legacy-registry resync submissions over several 15-second cycles.
            if ($isNewDevice -and $newDevicePostsThisCycle -ge $MaxNewDevicePostsPerCycle) { continue }
            $sendPri  = if ($isChange) { 2 } else { 10 }
            $queued   = Send-ToForms `
                -DeviceName $d.Name `
                -IP         $ip `
                -Status     $d.Status `
                -Latency    $d.Latency `
                -Network    $NetworkDisplay `
                -Color      $color `
                -Priority   $sendPri

            if ($queued) {
                if ($isNewDevice) { $newDevicePostsThisCycle++ }
                $d.LastSent = Get-Date
                $script:RegistryDirty = $true
                $d.LastSentStatus = $d.Status
            }
        }

        if ($RegistryDirty) { if (Save-Registry) { $RegistryDirty = $false } }

        if ($CycleTotal -ge $NetworkIssueMinDevices) {
            if ($networkState -ne "ONLINE") {
                $alertAge = ((Get-Date) - $LastNetworkAlert).TotalSeconds
                if ($networkState -ne $PreviousNetworkState -or $alertAge -ge $AlertCooldownSec) {
                    $summary = "Devices=$CycleTotal; Slow=$CycleSlow; Fail=$CycleFail; Affected=$([math]::Round($badRatio * 100))%"
                    if (Send-NetworkAlert -AlertStatus $networkState -Message $summary -Network $NetworkDisplay) {
                        $LastNetworkAlert = Get-Date
                        Write-Host "[$SiteName] [$(Get-Date -Format 'HH:mm:ss')] $networkState | $summary" -ForegroundColor Red
                    }
                }
            }
            elseif ($PreviousNetworkState -ne "ONLINE") {
                $summary = "Network recovered; Devices=$CycleTotal; Slow=$CycleSlow; Fail=$CycleFail"
                [void](Send-NetworkAlert -AlertStatus "NETWORK RECOVERED" -Message $summary -Network $NetworkDisplay)
                Write-Host "[$SiteName] [$(Get-Date -Format 'HH:mm:ss')] NETWORK RECOVERED" -ForegroundColor Green
            }

            $PreviousNetworkState = $networkState
        }

        if (((Get-Date) - $LastSummary).TotalSeconds -ge $SummarySec) {
            Write-TroubleshootEvent "LOCAL SUMMARY | $(Get-SummaryText '')"
            $LastSummary = Get-Date
        }

        Invoke-HeartbeatIfDue
    }
    catch {
        Write-Host "[$SiteName] [$(Get-Date -Format 'HH:mm:ss')] ERROR | $($_.Exception.Message)" -ForegroundColor Red
    }

    $CheckSec = $SteadyCheckSec

    $elapsed = ((Get-Date) - $cycleStart).TotalSeconds
    $until = (Get-Date).AddSeconds([math]::Max(1, $CheckSec - $elapsed))
    while ((Get-Date) -lt $until) {
        Start-Sleep -Milliseconds 1000
        Receive-PendingSends
        Invoke-HeartbeatIfDue
    }
}
}
finally {
    try { [void](Save-Registry) } catch {}
    try {
        Write-TroubleshootEvent "MONITOR STOPPED | Script stopped at $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')"
        $stopNet = Get-NetworkDisplay (Get-ActiveIPv4Adapter)
        [void](Send-MonitorHeartbeat -Network $stopNet -State "MONITOR STOPPED")
    } catch {}

    try {
        $deadline = (Get-Date).AddSeconds(15)
        while ($PendingSends.Count -gt 0 -and (Get-Date) -lt $deadline) {
            Receive-PendingSends
            Start-Sleep -Milliseconds 200
        }
        if ($SendPool) { $SendPool.Close(); $SendPool.Dispose() }
    } catch {}

    $stopTime = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
    Write-Host "[$SiteName] SCRIPT STOP : $stopTime" -ForegroundColor Yellow
    Write-Host "[$SiteName] LOCAL LOG   : $LogFile" -ForegroundColor Yellow

    if ($TranscriptStarted) {
        try { Stop-Transcript | Out-Null } catch {}
    }
}
