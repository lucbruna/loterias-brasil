@echo off
title Loterias Brasil - Build
echo.
echo  ^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=
echo     Compilando Loterias Brasil para producao
echo  ^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=
echo.
if exist dist rmdir /s /q dist
echo  Diretorio ./dist limpo.
echo.
npm run build
echo.
echo  Build concluido! Arquivos em ./dist
pause
