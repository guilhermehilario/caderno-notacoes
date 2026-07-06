#!/bin/bash
#
# start.sh — Inicia backend (NestJS) e frontend (Vite) simultaneamente
#
# Uso:
#   ./start.sh           # Inicia ambos os serviços
#   ./start.sh --backend # Só o backend
#   ./start.sh --frontend # Só o frontend
#

set -e

cleanup() {
  echo ""
  echo "⏹️  Encerrando serviços..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "✅ Serviços encerrados."
}

trap cleanup EXIT INT TERM

START_BACKEND=true
START_FRONTEND=true

case "$1" in
  --backend) START_FRONTEND=false ;;
  --frontend) START_BACKEND=false ;;
  --help)
    echo "Uso: $0 [--backend | --frontend | --help]"
    exit 0
    ;;
esac

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================="
echo "  🚀 Iniciando Revisa Aula"
echo "============================================="

# ── Backend (NestJS) ──
if $START_BACKEND; then
  echo ""
  echo "[1/2] Iniciando backend NestJS na porta 3000..."
  cd "$ROOT_DIR/server"

  if [ ! -d "node_modules" ]; then
    echo "      📦 Instalando dependências do backend..."
    npm install --silent
  fi

  npm run dev &
  BACKEND_PID=$!
  echo "      ✅ Backend iniciado (PID $BACKEND_PID)"
else
  echo ""
  echo "[1/2] Backend ignorado (--frontend)"
fi

# ── Frontend (Vite) ──
if $START_FRONTEND; then
  echo ""
  echo "[2/2] Iniciando frontend Vite na porta 5173..."
  cd "$ROOT_DIR"

  if [ ! -d "node_modules" ]; then
    echo "      📦 Instalando dependências do frontend..."
    npm install --silent
  fi

  npm run dev &
  FRONTEND_PID=$!
  echo "      ✅ Frontend iniciado (PID $FRONTEND_PID)"
else
  echo ""
  echo "[2/2] Frontend ignorado (--backend)"
fi

echo ""
echo "============================================="
echo "  📡 Backend:  http://localhost:3000"
echo "  🌐 Frontend: http://localhost:5173"
echo "============================================="
echo ""
echo "Pressione Ctrl+C para encerrar ambos."

wait
