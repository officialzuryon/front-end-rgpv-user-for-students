$paperDir = 'a:\anti gravity projects\rgpvpyq\back\front\paper'
$files = Get-ChildItem -Path $paperDir -Filter '*.html' -Recurse
$count = 0
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $new = $content
    $new = $new.Replace(
        '<h3 style="margin:0 0 8px 0; color:var(--text-primary); font-size:1.3rem;">Download Original PDF</h3>',
        '<h3 style="margin:0 0 8px 0; color:var(--text-primary); font-size:1.3rem;">Save as PDF</h3>'
    )
    $new = $new.Replace(
        '<p style="margin:0; color:var(--text-secondary); font-size:1rem;">Get the official university print version scanned document.</p>',
        '<p style="margin:0; color:var(--text-secondary); font-size:1rem;">Opens your browser print dialog — select "Save as PDF" to download.</p>'
    )
    if ($new -ne $content) {
        [System.IO.File]::WriteAllText($file.FullName, $new, [System.Text.Encoding]::UTF8)
        $count++
    }
}
Write-Host "Updated headings in $count files"
