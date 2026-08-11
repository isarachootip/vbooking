Add-Type -AssemblyName System.IO.Compression.FileSystem
$docxPath = "C:\Users\isara\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\local-agent-mode-sessions\1f500384-ac57-461e-b509-5176498cdddb\a024f8bf-e806-44fb-8ef8-7749b802e6e3\local_12772f44-ea93-4921-85eb-d7fe6994c4e1\outputs\PMT_Functional_Design_Summary.docx"
$zip = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
$entry = $zip.GetEntry("word/document.xml")
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xmlText = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

$xml = [xml]$xmlText
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
$textNodes = $xml.SelectNodes("//w:t", $ns)
$textList = New-Object System.Collections.Generic.List[string]
foreach ($node in $textNodes) {
    $textList.Add($node.InnerText)
}
[System.IO.File]::WriteAllLines("c:\atgv\vbooking\scratch\docx_text.txt", $textList)
