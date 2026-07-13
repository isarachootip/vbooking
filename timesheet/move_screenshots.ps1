$src = "$env:USERPROFILE\Downloads"
$dst = "C:\atgv\time_sheet\timesheet\screenshots"
New-Item -ItemType Directory -Path $dst -Force | Out-Null

$files = @(
  '01_dashboard.jpg','02_projects.jpg','03_timesheet.jpg',
  '04_tasks_summary.jpg','05_tasks_board.jpg','06_project_plan.jpg',
  '07_team_directory.jpg','08_pending_approvals.jpg',
  '09_reports.jpg','10_settings.jpg'
)

foreach ($f in $files) {
  $from = Join-Path $src $f
  $to   = Join-Path $dst $f
  if (Test-Path $from) {
    Copy-Item $from $to -Force
    Write-Output "Copied: $f"
  } else {
    Write-Output "NOT FOUND: $f"
  }
}
Write-Output "Done."
