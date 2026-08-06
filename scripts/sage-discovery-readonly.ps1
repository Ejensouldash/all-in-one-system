# Read-only Sage X3 installation discovery.
# It inventories services, folders and integration-shaped files without opening
# configuration values, databases, passwords or tokens.
$ErrorActionPreference = 'SilentlyContinue'
$root = 'C:\Sage'
if (-not (Test-Path -LiteralPath $root)) { Write-Host "C:\Sage was not found."; exit 1 }

$output = Join-Path $env:USERPROFILE ("Desktop\sage-discovery-{0}.txt" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$patterns = '\.(wsdl|xsd|json|yaml|yml|xml|ini|properties|conf|config|bat|cmd|ps1|sql)$'

"SAGE X3 READ-ONLY DISCOVERY" | Set-Content -LiteralPath $output
"Generated: $(Get-Date -Format o)" | Add-Content -LiteralPath $output
"Root: $root" | Add-Content -LiteralPath $output
"`n== TOP-LEVEL FOLDERS ==" | Add-Content -LiteralPath $output
Get-ChildItem -LiteralPath $root -Force | Select-Object Mode, LastWriteTime, Length, Name | Format-Table -AutoSize | Out-String | Add-Content -LiteralPath $output
"`n== WINDOWS SERVICES WITH SAGE/X3/ADX/SYRACUSE IN NAME ==" | Add-Content -LiteralPath $output
Get-Service | Where-Object { $_.Name -match 'sage|x3|adx|syracuse' -or $_.DisplayName -match 'sage|x3|adx|syracuse' } | Select-Object Status, Name, DisplayName | Format-Table -AutoSize | Out-String | Add-Content -LiteralPath $output
"`n== RELEVANT FILE NAMES (NO FILE CONTENT) ==" | Add-Content -LiteralPath $output
Get-ChildItem -LiteralPath $root -Recurse -Force -File | Where-Object { $_.Name -match $patterns -or $_.FullName -match 'soap|rest|web.?service|syracuse|api|sales.?order' } | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize -Wrap | Out-String -Width 220 | Add-Content -LiteralPath $output
"`n== LISTENING PORTS FOR SAGE-RELATED PROCESSES ==" | Add-Content -LiteralPath $output
$sageProcessIds = Get-Process | Where-Object { $_.ProcessName -match 'sage|x3|adx|syracuse|tomcat' } | Select-Object -ExpandProperty Id
if ($sageProcessIds) { Get-NetTCPConnection -State Listen | Where-Object { $sageProcessIds -contains $_.OwningProcess } | Select-Object LocalAddress, LocalPort, OwningProcess | Format-Table -AutoSize | Out-String | Add-Content -LiteralPath $output }
"`nNo configuration values, credentials, database contents, or document data were collected." | Add-Content -LiteralPath $output
Write-Host "Completed. Copy this small report to your AIO workspace: $output"
