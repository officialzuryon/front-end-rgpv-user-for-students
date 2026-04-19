$paperDir = 'a:\anti gravity projects\rgpvpyq\back\front\paper'
$files = Get-ChildItem -Path $paperDir -Filter '*.html' -Recurse
$count = 0
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $new = $content.Replace(
        'Opens your browser print dialog â€" select "Save as PDF" to download.',
        'Opens your browser print dialog — select "Save as PDF" to download.'
    )
    if ($new -ne $content) {
        [System.IO.File]::WriteAllText($file.FullName, $new, [System.Text.Encoding]::UTF8)
        $count++
    }
}
Write-Host "Fixed encoding in $count files"
