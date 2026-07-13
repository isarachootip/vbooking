param([string]$OutputFile)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Find secondary monitor
$screens = [System.Windows.Forms.Screen]::AllScreens
$s = $screens | Where-Object { -not $_.Primary } | Select-Object -First 1
if (-not $s) { $s = [System.Windows.Forms.Screen]::PrimaryScreen }

$b = $s.Bounds

# Capture full secondary screen
$bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)

# Save
$outDir = "C:\atgv\time_sheet\timesheet\screenshots"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$outPath = Join-Path $outDir $OutputFile
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose()
$bmp.Dispose()

Write-Output "Saved: $outPath ($($b.Width)x$($b.Height))"
