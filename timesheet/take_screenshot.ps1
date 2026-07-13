Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$outDir = "C:\atgv\time_sheet\timesheet\screenshots"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$screens = [System.Windows.Forms.Screen]::AllScreens
$s = $screens | Where-Object { -not $_.Primary } | Select-Object -First 1
if (-not $s) { $s = [System.Windows.Forms.Screen]::PrimaryScreen }

$b = $s.Bounds
$bmp = New-Object System.Drawing.Bitmap($b.Width, $b.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)

$filename = $args[0]
$bmp.Save("$outDir\$filename")
$g.Dispose()
$bmp.Dispose()
Write-Output "Saved: $outDir\$filename"
