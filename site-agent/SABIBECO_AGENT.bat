@echo off
chcp 65001 >nul
title SABIBECO SITE AGENT - Factory Network Telemetry
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$PSScriptRoot = '%~dp0'.TrimEnd('\'); $code = (Get-Content -LiteralPath '%~f0' -Encoding UTF8 | Select-Object -Skip 8) -join [Environment]::NewLine; Invoke-Expression $code"
if %ERRORLEVEL% neq 0 pause
exit /b

# ==============================================================================
#           SABIBECO SITE AGENT - DYNAMIC LOCAL IP TELEMETRY (NO HARDCODED SUBNETS)
#           Compatible with Windows PowerShell 5.1 & PowerShell 7+
#           Follows dynamic discovery pattern from SABIBECO_10.ps1
# ==============================================================================

# Ensure PSScriptRoot is always valid
if (-not $PSScriptRoot -or $PSScriptRoot -eq "") {
    $PSScriptRoot = (Get-Location).Path
}

# 1. Initialize Logs Directory and Configuration Files
$LogDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $LogDir)) {
    try {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    } catch {}
}

$PingListFile = Join-Path $PSScriptRoot "pinglist.txt"
$PingNoteFile = Join-Path $LogDir "pinglist_note.txt"
$ConfigFile = Join-Path $PSScriptRoot "server_ip.txt"
$DateStr = (Get-Date).ToString("yyyy-MM-dd")
$LogFile = Join-Path $LogDir "agent_$DateStr.log"

# Create default pinglist.txt if missing
if (-not (Test-Path $PingListFile)) {
    $defaultPingList = @"
# ==============================================================================
# SABIBECO SITE AGENT - CUSTOM PING TARGET LIST
# ==============================================================================
# Instructions:
# 1. Add IP addresses or hostnames you want to monitor (one per line).
# 2. Add an optional comment or device name after '#' on the same line.
# 3. Lines starting with '#' are comments and will be ignored.
#
# Examples:
# 192.168.1.1 # Local Gateway / Router
# 192.168.1.10 # Factory Server
# 192.168.1.25 # PLC / Production Line
# 8.8.8.8 # Google DNS (WAN Internet Uplink Check)
# 1.1.1.1 # Cloudflare DNS
# ==============================================================================

8.8.8.8 # WAN Internet Check
1.1.1.1 # Cloudflare DNS
"@
    try { Set-Content -Path $PingListFile -Value $defaultPingList -Encoding UTF8 } catch {}
}

# Logger function: logs to Console and appends to logs\agent_YYYY-MM-DD.log
function Write-AgentLog {
    param (
        [string]$Message,
        [string]$Level = "INFO",
        [System.ConsoleColor]$Color = [System.ConsoleColor]::White
    )
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $logLine = "[$ts] [$Level] $Message"
    Write-Host $logLine -ForegroundColor $Color
    try {
        Add-Content -Path $LogFile -Value $logLine -Encoding UTF8
    } catch {}
}

# Banner
Clear-Host
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "       SABIBECO - FACTORY NETWORK TELEMETRY AGENT (AUTO-MONITOR)" -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] Logs Folder:       $LogDir" -ForegroundColor DarkGray
Write-Host "[*] Custom Ping List:  $PingListFile" -ForegroundColor DarkGray
Write-Host ""

# Factory Sites Catalog (Matching SABIBECO_10.ps1: NO HARDCODED SUBNETS!)
$SiteCatalog = @{
    "1" = @{ Code="BSG_NINH_THUAN"; Name="BSG Ninh Thuan"; CodeNM="NT-77C9D48E177535414FC805FF" }
    "2" = @{ Code="BSG_PHU_LY";     Name="BSG Phu Ly";     CodeNM="PL-7BA3DF7289959A03A2ACDF03" }
    "3" = @{ Code="NM_BINH_DUONG";  Name="NM-Binh Duong";  CodeNM="BD-C3687A972CB91B18CCAD167A" }
    "4" = @{ Code="NM_DONG_THAP";   Name="NM-Dong Thap";   CodeNM="DT-69EC881899064464BDEE46EA" }
    "5" = @{ Code="NM_HOANG_QUYNH"; Name="NM-Hoang Quynh"; CodeNM="HQ-D92357730AA423A8E4EB1869" }
    "6" = @{ Code="SABIBECO_HO";    Name="Sabibeco HO";    CodeNM="HO-79601340F79939ED2FA0B2F5" }
    "7" = @{ Code="TMDV_BINH_TAY";  Name="TMDV BSG Binh Tay"; CodeNM="BT-62584DFDAF9F80D44D56A915" }
}

# ------------------------------------------------------------------------------
# 2. DYNAMIC NETWORK DISCOVERY (Like SABIBECO_10.ps1 - Reading actual machine IP/Subnet)
# ------------------------------------------------------------------------------
$DetectedAdapters = @()

# Method A: Query active network routes and IP addresses
try {
    $routes = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue |
        Where-Object { $_.NextHop -and $_.NextHop -ne "0.0.0.0" } |
        Sort-Object RouteMetric

    foreach ($route in $routes) {
        $ipObj = Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -and
                $_.IPAddress -notlike "169.254.*" -and
                $_.IPAddress -ne "127.0.0.1"
            } | Select-Object -First 1

        if ($ipObj) {
            $DetectedAdapters += [PSCustomObject]@{
                IP = [string]$ipObj.IPAddress
                PrefixLength = [int]$ipObj.PrefixLength
                InterfaceAlias = [string]$ipObj.InterfaceAlias
            }
        }
    }
} catch {}

# Method B: Query Up Network Adapters
if ($DetectedAdapters.Count -eq 0) {
    try {
        $upAdapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Up" }
        foreach ($adapter in $upAdapters) {
            $ips = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $adapter.ifIndex -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.IPAddress -and
                    $_.IPAddress -notlike "169.254.*" -and
                    $_.IPAddress -ne "127.0.0.1"
                }
            foreach ($ipObj in @($ips)) {
                $DetectedAdapters += [PSCustomObject]@{
                    IP = [string]$ipObj.IPAddress
                    PrefixLength = [int]$ipObj.PrefixLength
                    InterfaceAlias = [string]$ipObj.InterfaceAlias
                }
            }
        }
    } catch {}
}

# Method C: CIM Network Adapter fallback
if ($DetectedAdapters.Count -eq 0) {
    try {
        $cfg = Get-CimInstance Win32_NetworkAdapterConfiguration -ErrorAction SilentlyContinue |
            Where-Object { $_.IPEnabled -and $_.DefaultIPGateway } | Select-Object -First 1
        if ($cfg) {
            $ipv4 = @($cfg.IPAddress) | Where-Object { $_ -match '^\d{1,3}(\.\d{1,3}){3}$' -and $_ -notlike "169.254.*" } | Select-Object -First 1
            if ($ipv4) {
                $DetectedAdapters += [PSCustomObject]@{
                    IP = [string]$ipv4
                    PrefixLength = 24
                    InterfaceAlias = "Local Area Network"
                }
            }
        }
    } catch {}
}

# Extract Primary Host IP & Calculate Dynamic Subnet
$PrimaryAdapter = $DetectedAdapters | Select-Object -First 1
$HostIP = if ($PrimaryAdapter) { $PrimaryAdapter.IP } else { "127.0.0.1" }
$HostPrefixLength = if ($PrimaryAdapter -and $PrimaryAdapter.PrefixLength) { $PrimaryAdapter.PrefixLength } else { 24 }

# Compute Subnet Prefix (e.g. 192.168.1.114 -> 192.168.1. and 192.168.1.0/24)
$ipParts = $HostIP.Split('.')
$DynamicSubnetPrefix = if ($ipParts.Length -eq 4) { "$($ipParts[0]).$($ipParts[1]).$($ipParts[2])." } else { "192.168.1." }
$DynamicSubnetCIDR = "${DynamicSubnetPrefix}0/$HostPrefixLength"

Write-Host "[+] Local Host IP Address:        " -NoNewline
Write-Host $HostIP -ForegroundColor Yellow
if ($PrimaryAdapter.InterfaceAlias) {
    Write-Host "    Interface Adapter:            $($PrimaryAdapter.InterfaceAlias)" -ForegroundColor DarkGray
}
Write-Host "[+] Auto-Discovered Local Subnet: " -NoNewline
Write-Host "$DynamicSubnetCIDR (Prefix: $DynamicSubnetPrefix*)" -ForegroundColor Green
Write-Host "    (Subnet is read directly from this machine's network card - no static hardcoded ranges)" -ForegroundColor DarkGray
Write-Host ""

# Update pinglist_note.txt with dynamically discovered network
$noteContent = @"
==============================================================================
SABIBECO SITE AGENT - DYNAMIC NETWORK MONITORING GUIDE
==============================================================================

1. CURRENT HOST NETWORK:
   - Host Machine IP:     $HostIP
   - Discovered Subnet:   $DynamicSubnetCIDR (Prefix: $DynamicSubnetPrefix)
   - Interface:           $($PrimaryAdapter.InterfaceAlias)

2. PING TARGET LIST FILE:
   Location: $PingListFile
   Format:
     <IP_ADDRESS> # <Optional Device Label>
   Examples:
     ${DynamicSubnetPrefix}1 # Local Gateway Router
     ${DynamicSubnetPrefix}10 # Production Server
     8.8.8.8 # WAN Uplink Test

3. MONITORING MODES:
   - Mode 1: Auto-Scan Discovered Subnet ($DynamicSubnetCIDR)
     Performs high-speed asynchronous ICMP sweep across all 254 IPs on this machine's actual subnet.
   - Mode 2: Custom Ping List Only
     Monitors only the specific targets declared in pinglist.txt.
   - Mode 3: Hybrid Mode
     Combines both: machine's auto-discovered subnet + specific pinglist targets.

4. LOG FILES:
   - Directory: $LogDir
   - Daily Activity Log: logs\agent_YYYY-MM-DD.log
   - Latest Telemetry JSON: logs\latest_telemetry.json
   - Scan Summary Overview: logs\latest_summary.txt

5. RESPONSE THRESHOLDS:
   - Online:  Latency < 100 ms
   - Slow:    Latency >= 100 ms
   - Offline: No response or packet loss
==============================================================================
"@
try { Set-Content -Path $PingNoteFile -Value $noteContent -Encoding UTF8 } catch {}

# ------------------------------------------------------------------------------
# 3. SELECT FACTORY SITE (Matching SABIBECO_10.ps1: 7 Sites)
# ------------------------------------------------------------------------------
Write-Host "Please select which Factory Site this agent is running at:" -ForegroundColor Yellow
Write-Host "  [1] BSG Ninh Thuan      (CodeNM: NT-77C9D48E177535414FC805FF)"
Write-Host "  [2] BSG Phu Ly          (CodeNM: PL-7BA3DF7289959A03A2ACDF03)"
Write-Host "  [3] NM-Binh Duong       (CodeNM: BD-C3687A972CB91B18CCAD167A)"
Write-Host "  [4] NM-Dong Thap        (CodeNM: DT-69EC881899064464BDEE46EA)"
Write-Host "  [5] NM-Hoang Quynh      (CodeNM: HQ-D92357730AA423A8E4EB1869)"
Write-Host "  [6] Sabibeco HO         (CodeNM: HO-79601340F79939ED2FA0B2F5)"
Write-Host "  [7] TMDV BSG Binh Tay   (CodeNM: BT-62584DFDAF9F80D44D56A915)"
Write-Host ""

$SiteChoice = Read-Host "Enter factory number [1-7, Press ENTER = 3 NM-Binh Duong]"
if (-not $SiteChoice -or $SiteChoice.Trim() -eq "") { $SiteChoice = "3" }
if (-not $SiteCatalog.ContainsKey($SiteChoice)) { $SiteChoice = "3" }

$SelectedSite = $SiteCatalog[$SiteChoice]
Write-Host ""
Write-Host "[OK] Selected Site: $($SelectedSite.Name) (CodeNM: $($SelectedSite.CodeNM))" -ForegroundColor Green

# ------------------------------------------------------------------------------
# 4. CENTRAL SERVER CONFIGURATION (Auto-loads from server_ip.txt, no prompt)
# ------------------------------------------------------------------------------
$SavedServer = "http://localhost:8000"
if (Test-Path $ConfigFile) {
    try {
        $content = Get-Content $ConfigFile -Raw
        if ($content -and $content.Trim()) { $SavedServer = $content.Trim() }
    } catch {}
}

$ServerUrl = "$($SavedServer.TrimEnd('/'))/api/v1/telemetry/ingest"
Write-Host "[*] Central Server Target: $SavedServer" -ForegroundColor DarkGray
Write-Host "[*] Ingestion Endpoint:    $ServerUrl" -ForegroundColor DarkGray

# ------------------------------------------------------------------------------
# 5. AUTOMATIC SCAN MODE (Hybrid: Discovered Subnet + pinglist.txt)
# ------------------------------------------------------------------------------
$ScanMode = "3"
$ModeName = "Auto-Scan ($DynamicSubnetCIDR) + Custom Ping List"
Write-Host "[OK] Mode: $ModeName" -ForegroundColor Green
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Gray
Write-Host "  TELEMETRY AGENT RUNNING (Scanning & transmitting every 15 seconds)..." -ForegroundColor Green
Write-Host "  >> Press 'Q' or 'Ctrl+C' to Stop & immediately set Site OFFLINE <<" -ForegroundColor Yellow
Write-Host "===============================================================================" -ForegroundColor Gray
Write-Host ""

# Parse targets from pinglist.txt
function Load-PingListTargets {
    param ([string]$Path)
    $targets = New-Object System.Collections.Generic.List[PSCustomObject]
    if (Test-Path $Path) {
        $lines = Get-Content -Path $Path -Encoding UTF8
        foreach ($line in $lines) {
            $trimmed = $line.Trim()
            if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
            $ipPart = $trimmed
            $label = ""
            if ($trimmed -match '^([^#]+)#(.*)$') {
                $ipPart = $matches[1].Trim()
                $label = $matches[2].Trim()
            }
            if ($ipPart) {
                $targets.Add([PSCustomObject]@{
                    IP = $ipPart
                    Label = $label
                })
            }
        }
    }
    return $targets
}

# Ping custom targets concurrently
function Ping-TargetListFast {
    param (
        [System.Collections.Generic.List[PSCustomObject]]$TargetList,
        [int]$TimeoutMs = 500
    )
    $results = New-Object System.Collections.Generic.List[PSCustomObject]
    $tasks = New-Object System.Collections.Generic.List[PSCustomObject]

    foreach ($item in $TargetList) {
        try {
            $p = New-Object System.Net.NetworkInformation.Ping
            $task = $p.SendPingAsync($item.IP, $TimeoutMs)
            if ($task) {
                $tasks.Add([PSCustomObject]@{
                    Ping = $p
                    Task = $task
                    IP = $item.IP
                    Label = $item.Label
                })
            }
        } catch {}
    }

    if ($tasks.Count -gt 0) {
        $rawTasks = @($tasks | ForEach-Object { $_.Task })
        try {
            [System.Threading.Tasks.Task]::WaitAll($rawTasks) | Out-Null
        } catch {}

        foreach ($item in $tasks) {
            try {
                $res = $item.Task.Result
                if ($res -and $res.Status -eq [System.Net.NetworkInformation.IPStatus]::Success) {
                    $latency = [math]::Round($res.RoundtripTime, 1)
                    $status = if ($latency -ge 100) { "slow" } else { "online" }
                    $results.Add([PSCustomObject]@{
                        IP = $item.IP
                        Label = $item.Label
                        Status = $status
                        Latency = $latency
                    })
                } else {
                    $results.Add([PSCustomObject]@{
                        IP = $item.IP
                        Label = $item.Label
                        Status = "offline"
                        Latency = $null
                    })
                }
            } catch {
                $results.Add([PSCustomObject]@{
                    IP = $item.IP
                    Label = $item.Label
                    Status = "offline"
                    Latency = $null
                })
            } finally {
                try { $item.Ping.Dispose() } catch {}
            }
        }
    }

    return $results
}

# High-speed subnet asynchronous ICMP scan (.1 to .254)
function Scan-SubnetFast {
    param (
        [string]$SubnetPrefix,
        [int]$TimeoutMs = 400
    )
    
    $pings = New-Object System.Collections.Generic.List[PSCustomObject]
    $tasks = New-Object System.Collections.Generic.List[PSCustomObject]

    for ($i = 1; $i -le 254; $i++) {
        $ip = "$SubnetPrefix$i"
        try {
            $p = New-Object System.Net.NetworkInformation.Ping
            $task = $p.SendPingAsync($ip, $TimeoutMs)
            if ($task) {
                $tasks.Add([PSCustomObject]@{
                    Ping = $p
                    Task = $task
                    IP = $ip
                })
            }
        } catch {}
    }

    if ($tasks.Count -gt 0) {
        $rawTasks = @($tasks | ForEach-Object { $_.Task })
        try {
            [System.Threading.Tasks.Task]::WaitAll($rawTasks) | Out-Null
        } catch {}

        foreach ($item in $tasks) {
            try {
                $res = $item.Task.Result
                if ($res -and $res.Status -eq [System.Net.NetworkInformation.IPStatus]::Success) {
                    $latency = [math]::Round($res.RoundtripTime, 1)
                    $status = if ($latency -ge 100) { "slow" } else { "online" }
                    $pings.Add([PSCustomObject]@{
                        IP = $item.IP
                        Status = $status
                        Latency = $latency
                    })
                }
            } catch {}
            finally {
                try { $item.Ping.Dispose() } catch {}
            }
        }
    }

    return $pings
}

# Monitoring Loop (30-second interval)
$CycleCount = 1
Write-AgentLog "Agent initialized. Mode: $ModeName. Site: $($SelectedSite.Name) ($($SelectedSite.CodeNM))" "INFO" Green

try {
    while ($true) {
        $ScanStartTime = Get-Date
        Write-AgentLog "Starting Cycle #$CycleCount ($ModeName)..." "INFO" Yellow

        $DeviceMap = @{}

        # 1. Subnet Scan (if mode 1 or 3) -> Scans the DYNAMICALLY discovered subnet
        if ($ScanMode -eq "1" -or $ScanMode -eq "3") {
            $subnetResults = Scan-SubnetFast -SubnetPrefix $DynamicSubnetPrefix
            foreach ($r in $subnetResults) {
                $DeviceMap[$r.IP] = @{
                    IP = $r.IP
                    Status = $r.Status
                    Latency = $r.Latency
                    Label = ""
                }
            }
        }

        # 2. Ping List (if mode 2 or 3)
        if ($ScanMode -eq "2" -or $ScanMode -eq "3") {
            $targets = Load-PingListTargets -Path $PingListFile
            if ($targets.Count -gt 0) {
                $listResults = Ping-TargetListFast -TargetList $targets
                foreach ($r in $listResults) {
                    $DeviceMap[$r.IP] = @{
                        IP = $r.IP
                        Status = $r.Status
                        Latency = $r.Latency
                        Label = $r.Label
                    }
                }
            }
        }

        # Fetch ARP table for MAC mapping
        $ArpCache = @{}
        try {
            arp -a | ForEach-Object {
                if ($_ -match '([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9a-fA-F-]+)') {
                    $ArpCache[$matches[1]] = $matches[2].Replace("-", ":").ToUpper()
                }
            }
        } catch {}

        # Build devices telemetry list
        $DeviceList = @()
        foreach ($entry in $DeviceMap.Values) {
            $ip = $entry.IP
            $mac = $ArpCache[$ip]
            $label = $entry.Label
            
            $hostname = if ($label) { $label } else { "Host-$ip" }
            try {
                $dnsHost = [System.Net.Dns]::GetHostEntry($ip).HostName
                if ($dnsHost) { $hostname = $dnsHost }
            } catch {}

            # Classify device type
            $devType = "workstation"
            if ($ip.EndsWith(".1") -or $ip.EndsWith(".254") -or $label -match 'router|gateway|fw') {
                $devType = "router"
            } elseif ($ip.EndsWith(".2") -or $ip.EndsWith(".3") -or $label -match 'switch|sw') {
                $devType = "switch"
            } elseif ($label -match 'server|srv|dc|db|erp') {
                $devType = "server"
            } elseif ($ip -eq "8.8.8.8" -or $ip -eq "1.1.1.1") {
                $devType = "router"
            }

            $DeviceList += @{
                ip = $ip
                mac = $mac
                hostname = $hostname
                vendor = "Local Factory Network"
                status = $entry.Status
                response_time_ms = $entry.Latency
                device_type = $devType
                snmp_status = "disabled"
            }
        }

        $ScanDuration = [math]::Round(((Get-Date) - $ScanStartTime).TotalMilliseconds, 0)
        $ActiveCount = @($DeviceList | Where-Object { $_.status -in @("online", "slow") }).Count
        $SlowCount = @($DeviceList | Where-Object { $_.status -eq "slow" }).Count
        $OfflineCount = @($DeviceList | Where-Object { $_.status -eq "offline" }).Count

        Write-AgentLog "Cycle #$CycleCount scan completed in $($ScanDuration)ms. Found: $ActiveCount Online ($SlowCount Slow), $OfflineCount Offline." "INFO" Green

        # Construct Telemetry Payload (includes dynamically discovered subnet & CodeNM)
        $Payload = @{
            site_code = $SelectedSite.Code
            code_nm = $SelectedSite.CodeNM
            agent_version = "1.4.0"
            timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            discovered_subnets = @($DynamicSubnetCIDR)
            agent_metrics = @{
                scan_duration_ms = $ScanDuration
                total_active = $ActiveCount
            }
            devices = $DeviceList
        }

        $JsonBody = $Payload | ConvertTo-Json -Depth 5 -Compress

        # Save latest scan summary and JSON to logs
        try {
            Set-Content -Path (Join-Path $LogDir "latest_telemetry.json") -Value $JsonBody -Encoding UTF8
            $summaryText = @"
Timestamp:          $((Get-Date).ToString("yyyy-MM-dd HH:mm:ss"))
Site:               $($SelectedSite.Name) ($($SelectedSite.Code))
CodeNM:             $($SelectedSite.CodeNM)
Discovered Subnet:  $DynamicSubnetCIDR
Mode:               $ModeName
Duration:           $($ScanDuration) ms
Online Devices:     $ActiveCount
Slow (>=100ms):     $SlowCount
Offline:            $OfflineCount
Total Targets:      $(@($DeviceList).Count)
"@
            Set-Content -Path (Join-Path $LogDir "latest_summary.txt") -Value $summaryText -Encoding UTF8
        } catch {}

        # Transmit to Central Server
        try {
            $Headers = @{
                "Content-Type" = "application/json"
                "Authorization" = "Bearer sabibeco-secret-token-2026"
            }
            $Response = Invoke-RestMethod -Uri $ServerUrl -Method Post -Body $JsonBody -Headers $Headers -TimeoutSec 10
            $msg = if ($Response.message) { $Response.message } else { "HTTP 200 OK" }
            Write-AgentLog "Telemetry uploaded to Central Server! ($msg)" "SUCCESS" Cyan
        } catch {
            Write-AgentLog "Cannot reach Central Server ($ServerUrl): $($_.Exception.Message)" "WARNING" Red
            Write-AgentLog "Telemetry cached in logs\latest_telemetry.json. Will retry next cycle." "INFO" DarkGray
        }

        Write-Host "  -> Next scan in 15 seconds. [Press 'Q' or 'Ctrl+C' to Stop & go Offline]..." -ForegroundColor DarkGray
        Write-Host ""
        $CycleCount++
        for ($sec = 0; $sec -lt 15; $sec++) {
            if ([Console]::KeyAvailable) {
                $key = [Console]::ReadKey($true)
                if ($key.Key -eq [ConsoleKey]::Q -or $key.Key -eq [ConsoleKey]::X -or $key.Key -eq [ConsoleKey]::Escape) {
                    Write-AgentLog "Stopping Agent upon user request ('$($key.Key)')..." "WARNING" Yellow
                    break 2
                }
            }
            Start-Sleep -Seconds 1
        }
    }
} finally {
    Write-AgentLog "Agent stopping. Sending offline signal to Central Server..." "INFO" Yellow
    try {
        $OfflineUrl = "$($SavedServer.TrimEnd('/'))/api/v1/telemetry/offline"
        $OfflineBody = @{
            site_code = $SelectedSite.Code
            message = "Agent gracefully stopped"
        } | ConvertTo-Json -Compress
        $Headers = @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer sabibeco-secret-token-2026"
        }
        Invoke-RestMethod -Uri $OfflineUrl -Method Post -Body $OfflineBody -Headers $Headers -TimeoutSec 3 | Out-Null
        Write-AgentLog "Offline notification transmitted successfully." "SUCCESS" Green
    } catch {}
}
