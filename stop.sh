#!/bin/bash
#
# stop.sh — Encerra backend (NestJS) e frontend (Vite) iniciados pelo start.sh
#
# Uso:
#   ./stop.sh            # Encerra ambos os serviços
#   ./stop.sh --backend  # Só o backend
#   ./stop.sh --frontend # Só o frontend
#   ./stop.sh --force    # Força kill -9 se necessário
#

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

STOP_BACKEND=true
STOP_FRONTEND=true
FORCE=false

case "$1" in
  --backend) STOP_FRONTEND=false ;;
  --frontend) STOP_BACKEND=false ;;
  --force) FORCE=true ;;
  --help)
    echo "Uso: $0 [--backend | --frontend | --force | --help]"
    exit 0
    ;;
esac

KILL_CMD="kill"
if $FORCE; then
  KILL_CMD="kill -9"
fi

stopped_any=false

stop_service() {
  local name=$1
  local pidfile=$2

  if [ ! -f "$pidfile" ]; then
    echo "  ⏭️  $name — não foi iniciado pelo start.sh ou já foi encerrado"
    return 0
  fi

  local pid=$(cat "$pidfile" 2>/dev/null)

  if [ -z "$pid" ]; then
    echo "  ⚠️  $name — PID não encontrado no arquivo"
    rm -f "$pidfile"
    return 0
  fi

  if ! kill -0 "$pid" 2>/dev/null; then
    echo "  ⚠️  $name — processo $pid já não existe"
    rm -f "$pidfile"
    return 0
  fi

  echo "  🔄 Encerrando $name (PID $pid)..."
  $KILL_CMD "$pid" 2>/dev/null || true

  # Aguarda o processo terminar
  local waited=0
  while kill -0 "$pid" 2>/dev/null; do
    sleep 1
    waited=$((waited + 1))
    if [ $waited -ge 10 ]; then
      if ! $FORCE; then
        echo "     ⚠️  Processo não encerrou em 10s — use --force para kill -9"
      else
        echo "     ❌ Não foi possível encerrar o processo $pid"
      fi
      return 1
    fi
  done

  rm -f "$pidfile"
  echo "     ✅ $name encerrado"
  stopped_any=true
}

echo "============================================="
echo "  ⏹️  Encerrando Revisa Aula"
echo "============================================="
echo ""

if $STOP_BACKEND; then
  stop_service "Backend (NestJS)" "$BACKEND_PID_FILE"
  # Mata também processos residuais do ts-node-dev que possam ter ficado
  pkill -f "ts-node.*main.ts" 2>/dev/null || true
fi

if $STOP_FRONTEND; then
  stop_service "Frontend (Vite)" "$FRONTEND_PID_FILE"
  pkill -f "vite.*5173" 2>/dev/null || true
fi

echo ""
if $stopped_any; then
  echo "✅ Serviços encerrados com sucesso."
else
  echo "ℹ️  Nenhum serviço ativo para encerrar."
fi
echo ""
