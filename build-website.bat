@echo off
echo ===================================================
echo   RGPV Papers - Static Site Generator (SEO Build)
echo ===================================================
echo.

echo [1/4] Fetching latest database from Firebase...
node scripts/generate-static-data.js
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo [2/4] Regenerating individual paper pages...
node seo/generate-papers.js
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo [3/4] Auto-generating all subject landing pages...
node seo/generate-pages.js
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo [4/4] Rebuilding the Subjects Directory HTML...
node seo/generate-subjects.js
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo [5/6] Regenerating individual blog pages...
node scripts/generate-individual-blogs.js
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo [6/6] Regenerating main blog listing page...
node scripts/build-static-blogs.js
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo ===================================================
echo   ✅ BUILD COMPLETE! All papers, subjects, and blogs updated.
echo   Push these changes to GitHub to deploy to Vercel.
echo ===================================================
pause
