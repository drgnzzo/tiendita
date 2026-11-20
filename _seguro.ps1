# Escaneo básico de secretos y datos antes de commit; NO reemplaza revisión humana.
$ErrorActionPreference='Stop'
$bad=$false
$files = @()
# Solo se revisa lo que Git subiria: archivos ya versionados + nuevos NO ignorados.
# Los datos de data\local y logs\ estan en .gitignore y por eso no entran aqui; si alguien
# fuerza uno con 'git add -f', queda versionado y SI se bloquea mas abajo.
if (Get-Command git -ErrorAction SilentlyContinue) { $files = @(git -c core.quotepath=off ls-files --cached --others --exclude-standard) + @(git -c core.quotepath=off diff --cached --name-only) | Sort-Object -Unique }
if (!$files -or $files.Count -eq 0) { $files = @(Get-ChildItem -Path '.', 'docs','apps-script' -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object FullName) }
foreach($f in $files) {
  if (!(Test-Path $f -PathType Leaf)) {continue}
  if ($f -match '(^|[\\/])(\.git|node_modules|__pycache__)[\\/]') {continue}
  if ($f -match '\.gitkeep$') {continue}
  if ($f -match '(^|[\\/])(data[\\/](local|export)|logs)[\\/]') {Write-Host "BLOQUEADO dato local: $f"; $bad=$true;continue}
  if ($f -match '(^|[\\/])\.env($|\.)|\.p12$|\.pem$|\.key$|session[_-]?cookie|credential.*\.json') {Write-Host "BLOQUEADO archivo secreto: $f";$bad=$true;continue}
  $txt=Get-Content -Raw $f -ErrorAction SilentlyContinue
  if ($null -eq $txt) {continue}
  if ($txt -match '(?im)^\s*(password|api[_-]?key|secret|token)\s*[:=]\s*["''][^"'']{10,}["'']') {Write-Host "REVISAR posible credencial asignada: $f";$bad=$true}
}
if($bad){ exit 1 };Write-Host 'Chequeo preventivo sin alertas (revisión humana sigue obligatoria).';exit 0
