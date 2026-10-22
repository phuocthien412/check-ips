<#
.SYNOPSIS
    Script cài đặt Site Agent thành Windows Service tự động chạy ngầm.
.DESCRIPTION
    Sử dụng NSSM (Non-Sucking Service Manager) hoặc Windows SC để tạo service
    tự động khởi động cùng hệ điều hành và tự phục hồi khi gặp sự cố.
.EXAMPLE
    .\install_service.ps1 -Install
    .\install_service.ps1 -Uninstall
    .\install_service.ps1 -Status
#>

param (
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Status,
    [switch]$Start,
    [switch]$Stop,
    [string]$ServiceName = "SabibecoSiteAgent"
)

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ExePath = Join-Path $CurrentDir "site_agent.exe"

# Kiểm tra file exe
if (-not (Test-Path $ExePath)) {
    $ExePath = Join-Path $CurrentDir "dist\site_agent.exe"
}

function Show-Help {
    Write-Host "=== SABIBECO SITE AGENT SERVICE MANAGER ===" -ForegroundColor Cyan
    Write-Host "Cú pháp:"
    Write-Host "  .\install_service.ps1 -Install     : Đăng ký & Kích hoạt Windows Service"
    Write-Host "  .\install_service.ps1 -Start       : Khởi chạy service"
    Write-Host "  .\install_service.ps1 -Stop        : Tạm dừng service"
    Write-Host "  .\install_service.ps1 -Status      : Kiểm tra trạng thái service"
    Write-Host "  .\install_service.ps1 -Uninstall   : Xóa Windows Service"
}

if ($Install) {
    Write-Host "[1/3] Đang kiểm tra quyền Quản trị viên (Administrator)..." -ForegroundColor Yellow
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Error "Vui lòng mở PowerShell bằng quyền 'Run as Administrator' để cài đặt Service!"
        exit 1
    }

    if (-not (Test-Path $ExePath)) {
        Write-Error "Không tìm thấy file $ExePath. Hãy biên dịch file .exe trước bằng lệnh: python build_exe.py"
        exit 1
    }

    Write-Host "[2/3] Đang đăng ký Windows Service '$ServiceName'..." -ForegroundColor Yellow
    # Dùng sc.exe tích hợp sẵn trên Windows
    $binPath = "`"$ExePath`""
    & sc.exe create $ServiceName binPath= $binPath start= auto DisplayName= "Sabibeco Network Site Agent"

    # Cấu hình tự động restart sau 5 giây nếu bị lỗi
    & sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/5000/restart/5000

    Write-Host "[3/3] Khởi chạy Service..." -ForegroundColor Yellow
    & sc.exe start $ServiceName
    Write-Host "`n[THÀNH CÔNG] Service '$ServiceName' đã được cài đặt và đang chạy ngầm!" -ForegroundColor Green
    exit 0
}

if ($Start) {
    & sc.exe start $ServiceName
    exit 0
}

if ($Stop) {
    & sc.exe stop $ServiceName
    exit 0
}

if ($Status) {
    & sc.exe query $ServiceName
    exit 0
}

if ($Uninstall) {
    Write-Host "Đang dừng service '$ServiceName'..." -ForegroundColor Yellow
    & sc.exe stop $ServiceName
    Start-Sleep -Seconds 2
    Write-Host "Đang xóa service '$ServiceName'..." -ForegroundColor Yellow
    & sc.exe delete $ServiceName
    Write-Host "[THÀNH CÔNG] Đã gỡ bỏ Service '$ServiceName' khỏi hệ thống!" -ForegroundColor Green
    exit 0
}

Show-Help
