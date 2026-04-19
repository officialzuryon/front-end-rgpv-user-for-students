$paperDir = 'a:\anti gravity projects\rgpvpyq\back\front\paper'
$files = Get-ChildItem -Path $paperDir -Filter '*.html' -Recurse

$oldBtn = '<a href="#" download class="btn btn-primary btn-lg" style="box-shadow:var(--shadow-md);"> Download PDF</a>'

$newBtn = '<button class="btn-print-pdf" onclick="window.print()" aria-label="Save this paper as PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Save as PDF</button>'

$count = 0
$skipped = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    if ($content -like '*href="#" download*') {
        $newContent = $content.Replace($oldBtn, $newBtn)
        if ($newContent -ne $content) {
            [System.IO.File]::WriteAllText($file.FullName, $newContent, [System.Text.Encoding]::UTF8)
            $count++
        } else {
            $skipped++
        }
    } else {
        $skipped++
    }
}

Write-Host "Updated: $count files"
Write-Host "Skipped: $skipped files"
