#!/usr/bin/env bash
set -euo pipefail

# Only run in remote (Claude Code on the web) sessions.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

# ----------------------------------------------------------------------
# 1. Install npm dependencies so tsc / dev / build work in fresh sessions.
# ----------------------------------------------------------------------
if [ -f package.json ] && [ ! -d node_modules ]; then
  echo "→ Installing npm dependencies..."
  npm install --silent --no-audit --no-fund
fi

# ----------------------------------------------------------------------
# 2. Install claude-seo plugin (skills + agents) into ~/.claude/.
#    Pinned to a release tag; override with CLAUDE_SEO_TAG=main.
# ----------------------------------------------------------------------
CLAUDE_SEO_TAG="${CLAUDE_SEO_TAG:-v2.0.0}"
CLAUDE_SEO_REPO="https://github.com/AgriciDaniel/claude-seo.git"
SKILL_DIR="${HOME}/.claude/skills/seo"
AGENT_DIR="${HOME}/.claude/agents"
MARKER_FILE="${SKILL_DIR}/.installed-tag"

needs_install=true
if [ -f "${MARKER_FILE}" ] && [ "$(cat "${MARKER_FILE}" 2>/dev/null || true)" = "${CLAUDE_SEO_TAG}" ]; then
  needs_install=false
fi

if [ "${needs_install}" = "true" ]; then
  echo "→ Installing claude-seo ${CLAUDE_SEO_TAG}..."

  if ! command -v python3 >/dev/null 2>&1; then
    echo "  ⚠ python3 not found — skipping claude-seo install."
  else
    TEMP_DIR="$(mktemp -d)"
    trap 'rm -rf "${TEMP_DIR}"' EXIT

    if git clone --depth 1 --branch "${CLAUDE_SEO_TAG}" "${CLAUDE_SEO_REPO}" "${TEMP_DIR}/claude-seo" >/dev/null 2>&1; then
      mkdir -p "${SKILL_DIR}" "${AGENT_DIR}"

      # Copy top-level seo skill (auditor/orchestrator)
      if [ -d "${TEMP_DIR}/claude-seo/skills/seo" ]; then
        cp -r "${TEMP_DIR}/claude-seo/skills/seo/"* "${SKILL_DIR}/"
      fi

      # Copy each sub-skill (seo-audit, seo-page, seo-schema, etc.)
      for skill_path in "${TEMP_DIR}/claude-seo/skills"/*/; do
        skill_name="$(basename "${skill_path}")"
        [ "${skill_name}" = "seo" ] && continue
        target="${HOME}/.claude/skills/${skill_name}"
        mkdir -p "${target}"
        cp -r "${skill_path}"* "${target}/"
      done

      # Copy bundled resources used by skills
      for res in schema pdf scripts hooks; do
        if [ -d "${TEMP_DIR}/claude-seo/${res}" ]; then
          mkdir -p "${SKILL_DIR}/${res}"
          cp -r "${TEMP_DIR}/claude-seo/${res}/"* "${SKILL_DIR}/${res}/"
        fi
      done
      chmod +x "${SKILL_DIR}/hooks/"*.sh 2>/dev/null || true
      chmod +x "${SKILL_DIR}/hooks/"*.py 2>/dev/null || true

      # Copy specialist agents
      cp -r "${TEMP_DIR}/claude-seo/agents/"*.md "${AGENT_DIR}/" 2>/dev/null || true

      # Install Python deps into an isolated venv inside the skill dir.
      if [ -f "${TEMP_DIR}/claude-seo/requirements.txt" ]; then
        cp "${TEMP_DIR}/claude-seo/requirements.txt" "${SKILL_DIR}/requirements.txt"
        VENV_DIR="${SKILL_DIR}/.venv"
        if python3 -m venv "${VENV_DIR}" >/dev/null 2>&1; then
          "${VENV_DIR}/bin/pip" install --quiet --upgrade pip >/dev/null 2>&1 || true
          "${VENV_DIR}/bin/pip" install --quiet -r "${SKILL_DIR}/requirements.txt" >/dev/null 2>&1 \
            || echo "  ⚠ Some claude-seo Python deps failed to install (visual/Google features may be limited)."
        else
          echo "  ⚠ Could not create venv for claude-seo Python deps."
        fi
      fi

      echo "${CLAUDE_SEO_TAG}" > "${MARKER_FILE}"
      echo "  ✓ claude-seo ${CLAUDE_SEO_TAG} installed."
    else
      echo "  ⚠ Failed to clone claude-seo (network?). Skipping."
    fi
  fi
else
  echo "✓ claude-seo ${CLAUDE_SEO_TAG} already installed."
fi
