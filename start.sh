#!/bin/bash
#
# start.sh — Inicia backend (NestJS) e frontend (Vite) de forma PERSISTENTE
#
# Os processos são desanexados do shell com setsid, então continuam rodando
# mesmo depois de fechar o terminal. Use stop.sh para encerrá-los.
#
# Uso:
#   ./start.sh            # Inicia ambos os serviços
#   ./start.sh --backend  # Só o backend
#   ./start.sh --frontend # Só o frontend
#   ./start.sh --status   # Mostra status dos serviços
#

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"
BACKEND_LOG="$ROOT_DIR/server/logs/server.log"
FRONTEND_LOG="$ROOT_DIR/logs/frontend.log"

START_BACKEND=true
START_FRONTEND=true

case "$1" in
  --backend) START_FRONTEND=false ;;
  --frontend) START_BACKEND=false ;;
  --status)
    echo "============================================="
    echo "  📊 Status dos Serviços"
    echo "============================================="
    for svc in backend frontend; do
      pid_file="$PID_DIR/$svc.pid"
      if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file" 2>/dev/null)
        if kill -0 "$pid" 2>/dev/null; then
          echo "  ✅ $svc rodando (PID $pid)"
        else
          echo "  ❌ $svc parado (PID $pid não encontrado)"
          rm -f "$pid_file"
        fi
      else
        echo "  ❌ $svc não iniciado"
      fi
    done
    echo "============================================="
    exit 0
    ;;
  --help)
    echo "Uso: $0 [--backend | --frontend | --status | --help]"
    echo ""
    echo "  (sem args)   Inicia backend e frontend"
    echo "  --backend    Inicia apenas o backend"
    echo "  --frontend   Inicia apenas o frontend"
    echo "  --status     Mostra se os serviços estão rodando"
    exit 0
    ;;
esac

# ── Cria diretórios necessários ──
mkdir -p "$PID_DIR"
mkdir -p "$ROOT_DIR/server/logs"
mkdir -p "$ROOT_DIR/logs"

echo "============================================="
echo "  🚀 Iniciando Revisa Aula (modo persistente)"
echo "============================================="
echo ""

# ── Função para iniciar um serviço com setsid ──
start_service() {
  local name=$1
  local workdir=$2
  local cmd=$3
  local logfile=$4
  local pidfile=$5
  local port=$6

  # Verifica se já está rodando
  if [ -f "$pidfile" ]; then
    local old_pid=$(cat "$pidfile" 2>/dev/null)
    if kill -0 "$old_pid" 2>/dev/null; then
      echo "  ⏭️  $name já está rodando (PID $old_pid) — use stop.sh primeiro"
      return 1
    fi
    rm -f "$pidfile"
  fi

  echo "  🔄 Iniciando $name na porta $port..."

  # Cria o diretório do log se não existir
  mkdir -p "$(dirname "$logfile")"

  # Executa o comando em um grupo de processos completamente desanexado
  # Usando setsid para criar uma nova sessão, desassociada do terminal
  cd "$workdir"

  # Verifica dependências
  if [ ! -d "node_modules" ]; then
    echo "     📦 Instalando dependências..."
    npm install --silent
  fi

  # Inicia com setsid, redirecionando stdin/stdout/stderr
  # NOTA: $$ dentro do bash -c é o PID do próprio shell (que após exec vira o PID do servidor)
  setsid bash -c "
    exec > '$logfile' 2>&1
    echo '[start.sh] Iniciando $name em $(date)'
    echo \"[start.sh] PID: \$\$\"
    echo \$\$ > '$pidfile'
    exec $cmd
  " &

  # Aguarda um pouco e verifica se subiu
  local wait_time=0
  local max_wait=30

  # Define a URL de health check conforme o tipo de serviço
  local health_url
  if [[ "$name" == *"Backend"* ]]; then
    health_url="http://localhost:$port/api/health"
  else
    health_url="http://localhost:$port/"
  fi

  while [ $wait_time -lt $max_wait ]; do
    sleep 1
    wait_time=$((wait_time + 1))

    # Verifica se o PID foi escrito e o processo existe
    if [ -f "$pidfile" ]; then
      local pid=$(cat "$pidfile" 2>/dev/null)
      if [ -n "$pid" ] && [ "$pid" -eq "$pid" ] 2>/dev/null; then
        if kill -0 "$pid" 2>/dev/null; then
          # Verifica se está respondendo na porta
          if command -v curl &>/dev/null; then
            if curl -s -o /dev/null --max-time 2 "$health_url" 2>/dev/null; then
              echo "     ✅ $name rodando (PID $pid) — porta $port"
              return 0
            fi
          else
            # Sem curl, apenas confirma que o processo existe
            echo "     ✅ $name iniciado (PID $pid) — porta $port (curl não disponível)"
            return 0
          fi
        fi
      fi
    fi
  done

  # Timeout — verifica o log para diagnóstico
  if [ -f "$pidfile" ]; then
    local pid=$(cat "$pidfile" 2>/dev/null)
    if [ -n "$pid" ] && [ "$pid" -eq "$pid" ] 2>/dev/null; then
      if kill -0 "$pid" 2>/dev/null; then
        echo "     ⚠️  $name iniciado (PID $pid) mas pode não estar respondendo ainda"
        echo "     📋 Log: $logfile"
        return 0
      fi
    fi
  fi

  echo "     ❌ Falha ao iniciar $name — verifique o log: $logfile"
  tail -5 "$logfile" 2>/dev/null || true
  return 1
}

# ── Backend ──
if $START_BACKEND; then
  start_service \
    "Backend (NestJS)" \
    "$ROOT_DIR/server" \
    "npx ts-node-dev --respawn --transpile-only src/main.ts" \
    "$BACKEND_LOG" \
    "$BACKEND_PID_FILE" \
    "3000"
else
  echo "  ⏭️  Backend ignorado (--frontend)"
fi

# ── Frontend ──
if $START_FRONTEND; then
  # O Vite responde em qualquer path, então usamos / como health check
  start_service \
    "Frontend (Vite)" \
    "$ROOT_DIR" \
    "npx vite --port 5173 --strictPort" \
    "$FRONTEND_LOG" \
    "$FRONTEND_PID_FILE" \
    "5173"
else
  echo "  ⏭️  Frontend ignorado (--backend)"
fi

echo ""
echo "============================================="
echo "  📡 Backend:  http://localhost:3000"
echo "  🌐 Frontend: http://localhost:5173"
echo "============================================="
echo ""
echo "  📋 Logs:"
if $START_BACKEND; then echo "     Backend  → $BACKEND_LOG"; fi
if $START_FRONTEND; then echo "     Frontend → $FRONTEND_LOG"; fi
echo ""
echo "  ℹ️  Para ver o status:   ./start.sh --status"
echo "  ℹ️  Para encerrar:       ./stop.sh"
echo ""
