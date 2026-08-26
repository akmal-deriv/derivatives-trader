#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# env-cipher.sh — Encrypt/decrypt environment-specific .env files
#
# Usage:
#   ./scripts/env-cipher.sh encrypt staging      # .env.staging → .env.staging.enc
#   ./scripts/env-cipher.sh encrypt production   # .env.production → .env.production.enc
#   ./scripts/env-cipher.sh decrypt staging      # .env.staging.enc → .env.staging
#   ./scripts/env-cipher.sh decrypt production   # .env.production.enc → .env.production
#
# The encryption key is read from the ENV_ENCRYPTION_KEY
# environment variable. If not set, you will be prompted.
#
# Algorithm: AES-256-CBC (OpenSSL with PBKDF2 key derivation)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Env files live in the parent of the submodule (e.g. playwright/.env.staging.enc), go up one more level to the project root
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Color output helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Valid environment names
VALID_ENVS=("staging" "production")

usage() {
  echo "Usage: $0 {encrypt|decrypt} {staging|production}"
  echo ""
  echo "Commands:"
  echo "  encrypt staging      Encrypt .env.staging → .env.staging.enc"
  echo "  encrypt production   Encrypt .env.production → .env.production.enc"
  echo "  decrypt staging      Decrypt .env.staging.enc → .env.staging"
  echo "  decrypt production   Decrypt .env.production.enc → .env.production"
  echo ""
  echo "Set ENV_ENCRYPTION_KEY env var or you will be prompted for the passphrase."
  exit 1
}

# Validate environment argument
validate_env() {
  local env_name="$1"
  for valid in "${VALID_ENVS[@]}"; do
    if [[ "$env_name" == "$valid" ]]; then
      return 0
    fi
  done
  echo -e "${RED}❌ Invalid environment: '$env_name'${NC}"
  echo "Valid environments: ${VALID_ENVS[*]}"
  exit 1
}

# Ensures ENV_ENCRYPTION_KEY is set. If not already in the environment
# (e.g. CI), prompts the user interactively and exports it.
#
# IMPORTANT: This function must be called DIRECTLY in the parent shell —
# never inside a subshell (e.g. $(ensure_key)). Command substitution
# creates a subshell, so any `export` inside it would be lost.
#
# SECURITY NOTE: The passphrase is visible via `env` or /proc/<pid>/environ
# to processes running as the same user for the lifetime of this script.
# Acceptable trade-off for a local dev tool — the alternative (pass:) would
# expose it in /proc/pid/cmdline which is world-readable on Linux.
ensure_key() {
  if [ -z "${ENV_ENCRYPTION_KEY:-}" ]; then
    # Disable history expansion so '!' in passphrases is never interpreted
    set +o histexpand 2>/dev/null || true
    echo -e "${YELLOW}Enter encryption passphrase:${NC}" >&2
    # IFS= prevents trimming leading/trailing whitespace from the key
    # -r prevents backslash interpretation (e.g. \n stays literal)
    # -s hides typed characters (password prompt)
    IFS= read -rs ENV_ENCRYPTION_KEY
    echo "" >&2

    if [ -z "$ENV_ENCRYPTION_KEY" ]; then
      echo -e "${RED}❌ Passphrase cannot be empty${NC}" >&2
      exit 1
    fi

    export ENV_ENCRYPTION_KEY
  fi
}

# Returns the OpenSSL -pass argument. Always uses env: form so the key
# never appears in process arguments. Call ensure_key() first.
get_pass_arg() {
  echo "env:ENV_ENCRYPTION_KEY"
}

do_encrypt() {
  local env_name="$1"
  local ENV_FILE="$PROJECT_ROOT/.env.${env_name}"
  local ENC_FILE="$PROJECT_ROOT/.env.${env_name}.enc"

  if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: $ENV_FILE not found${NC}"
    echo "Create a .env.${env_name} file first, then run this script to encrypt it."
    exit 1
  fi

  # Prompt for key if not in environment (must run in parent shell, not subshell)
  ensure_key

  local PASS_ARG
  PASS_ARG=$(get_pass_arg)

  echo "Encrypting $ENV_FILE → $ENC_FILE ..."
  openssl enc -aes-256-cbc -pbkdf2 -salt \
    -in "$ENV_FILE" \
    -out "$ENC_FILE" \
    -pass "$PASS_ARG"

  echo -e "${GREEN}✅ Encrypted successfully: $ENC_FILE${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Commit .env.${env_name}.enc to git:  git add .env.${env_name}.enc && git commit -m 'chore: update encrypted ${env_name} env'"
  echo "  2. Ensure ENV_ENCRYPTION_KEY is set as a GitHub secret"
  echo ""
  echo -e "${YELLOW}⚠️  NEVER commit .env.${env_name} (plaintext) — only .env.${env_name}.enc (encrypted)${NC}"
}

do_decrypt() {
  local env_name="$1"
  local ENV_FILE="$PROJECT_ROOT/.env.${env_name}"
  local ENC_FILE="$PROJECT_ROOT/.env.${env_name}.enc"

  if [ ! -f "$ENC_FILE" ]; then
    echo -e "${RED}❌ Error: $ENC_FILE not found${NC}"
    echo "Pull the latest code — .env.${env_name}.enc should be in the repository."
    exit 1
  fi

  if [ -f "$ENV_FILE" ]; then
    local CHOICE
    echo -e "${YELLOW}⚠️  .env.${env_name} already exists.${NC}"
    echo "  [o] Overwrite — replace .env.${env_name} with decrypted version"
    echo "  [k] Keep both — backup existing .env.${env_name} to .env.${env_name}.old, then decrypt"
    echo "  [c] Cancel"
    echo -n "Choose [o/k/c]: "
    read -r CHOICE
    case "$CHOICE" in
      o|O)
        echo "Overwriting .env.${env_name}..."
        ;;
      k|K)
        echo -e "Backing up .env.${env_name} → .env.${env_name}.old"
        mv "$ENV_FILE" "$PROJECT_ROOT/.env.${env_name}.old"
        ;;
      *)
        echo "Aborted."
        exit 0
        ;;
    esac
  fi

  # Prompt for key if not in environment (must run in parent shell, not subshell)
  ensure_key

  local PASS_ARG
  PASS_ARG=$(get_pass_arg)

  echo "Decrypting $ENC_FILE → $ENV_FILE ..."
  openssl enc -aes-256-cbc -pbkdf2 -d \
    -in "$ENC_FILE" \
    -out "$ENV_FILE" \
    -pass "$PASS_ARG"

  # ── Integrity check ──
  # Verify the decrypted file is non-empty and looks like a valid .env
  # (contains at least one KEY=VALUE line). A wrong passphrase produces
  # garbage output that OpenSSL may not always detect as an error.
  if [ ! -s "$ENV_FILE" ]; then
    echo -e "${RED}❌ Decrypted file is empty — wrong passphrase or corrupted .env.${env_name}.enc${NC}"
    rm -f "$ENV_FILE"
    exit 1
  fi

  if ! grep -qE '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_FILE"; then
    echo -e "${RED}❌ Decrypted file does not contain any KEY=VALUE lines — likely wrong passphrase${NC}"
    echo "  The file may contain binary garbage from a decryption failure."
    rm -f "$ENV_FILE"
    exit 1
  fi

  echo -e "${GREEN}✅ Decrypted successfully: $ENV_FILE${NC}"
}

# ── Main ──
if [ $# -lt 2 ]; then
  usage
fi

ACTION="${1:-}"
ENV_NAME="${2:-}"

validate_env "$ENV_NAME"

case "$ACTION" in
  encrypt) do_encrypt "$ENV_NAME" ;;
  decrypt) do_decrypt "$ENV_NAME" ;;
  *)       usage ;;
esac
