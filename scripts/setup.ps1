# Deprecated alias — use ./install.ps1 or pnpm spirit-install
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
pnpm spirit-install @args
