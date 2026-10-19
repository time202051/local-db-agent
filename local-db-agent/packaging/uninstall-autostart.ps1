# Remove the autostart scheduled task
Unregister-ScheduledTask -TaskName 'AgentLocalChat' -Confirm:$false -ErrorAction SilentlyContinue
Write-Host 'Autostart removed: AgentLocalChat'
