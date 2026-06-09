# Run in PowerShell as Administrator
# Allows phone -> PC Metro on port 8081 (LAN / PC hotspot)

$ruleName = "Expo Metro 8081 Inbound"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Rule already exists: $ruleName"
} else {
  New-NetFirewallRule `
    -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 8081 `
    -Action Allow `
    -Profile Any
  Write-Host "Created firewall rule: $ruleName"
}

Write-Host ""
Write-Host "Next: start Expo on hotspot IP"
Write-Host '  cd apps\mobile'
Write-Host '  $env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.137.1"'
Write-Host '  npx expo start --port 8081 --lan'
Write-Host ""
Write-Host "Phone URL: exp://192.168.137.1:8081"
