# Register a logon-triggered scheduled task (auto-start agent-local in background)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbs = Join-Path $here 'start-agent.vbs'

if (-not (Test-Path $vbs)) { Write-Error "Cannot find $vbs"; exit 1 }

$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('"{0}"' -f $vbs)
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName 'AgentLocalChat' -Action $action -Trigger $trigger `
    -Settings $settings -Description 'Local DB query agent' -Force | Out-Null

Write-Host 'Autostart registered (runs at logon): AgentLocalChat'
