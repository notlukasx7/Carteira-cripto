@echo off
SETLOCAL

echo ============================================
echo  Bitcoin Wallet Desktop - Setup de Instalacao
echo ============================================
echo.

REM Verifica se npm esta disponivel
where npm >nul 2>&1
IF ERRORLEVEL 1 (
  echo [ERRO] npm nao foi encontrado no PATH.
  echo Instale o Node.js (que inclui o npm) em:
  echo   https://nodejs.org
  echo Depois abra um novo Prompt de Comando e rode este script novamente.
  pause
  EXIT /B 1
)

echo [1/2] Instalando dependencias (npm install)...
npm install
IF ERRORLEVEL 1 (
  echo.
  echo [ERRO] Falha ao executar "npm install".
  echo Verifique a conexao com a internet e tente novamente.
  pause
  EXIT /B 1
)

echo.
echo [2/2] Gerando instalador (npm run dist)...
npm run dist
IF ERRORLEVEL 1 (
  echo.
  echo [ERRO] Falha ao executar "npm run dist".
  echo Verifique o log acima para detalhes.
  pause
  EXIT /B 1
)

echo.
echo ============================================
echo  Setup concluido com sucesso!
echo  O instalador deve estar na pasta "release"
echo ============================================
echo.
pause

ENDLOCAL

