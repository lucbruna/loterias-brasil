@echo off
title Loterias Brasil - Build
echo.
echo  ^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=
echo     Compilando Loterias Brasil para producao
echo  ^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=^=
echo.
npm run build
echo.
echo  Build concluido! Arquivos em ./dist
pause
