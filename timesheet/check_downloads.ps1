$down = "$env:USERPROFILE\Downloads"
Get-ChildItem $down -Filter "*.jpg" | 
  Where-Object { $_.LastWriteTime -gt (Get-Date).AddHours(-2) } |
  Sort-Object Name |
  Select-Object Name, Length, LastWriteTime |
  Format-Table -AutoSize
