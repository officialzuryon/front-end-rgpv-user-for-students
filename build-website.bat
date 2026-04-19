@echo off
echo ===================================================
echo   RGPV Papers - Static Site Generator (SEO Build)
echo ===================================================
echo.

echo [1/4] Fetching latest database from Firebase (Skipping for Dummy Test)...
rem node scripts/generate-static-data.js
rem if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo [2/4] Generating Native Physical Directory...
node seo/generate-file-directory.js
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo [3/4] Generating Individual Long-Tail Paper Pages...
node seo/generate-papers.js
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo [4/4] Regenerating Blog Pages...
node scripts/generate-individual-blogs.js
node scripts/build-static-blogs.js

echo.
echo ===================================================
echo   ✅ BUILD COMPLETE! Massive Directory structure generated.
echo   Check your front/ directory to see all the new HTML files!
echo ===================================================
pause
