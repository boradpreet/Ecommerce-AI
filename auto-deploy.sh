#!/usr/bin/env bash
#
# Voqly auto-deploy: polls origin/main and redeploys when the developer pushes.
#
# Deploy model
# ────────────
# The developer pushes app changes to origin/main (GitHub). The server MAY carry
# extra local commits on top of origin/main (deploy config, server-side hotfixes,
# security patches). Each run rebases those local commits onto the latest
# origin/main, then rebuilds.
#
# Safety guarantees (so a bad dev push or a half-finished server edit can never
# take prod down):
#   1. Never act on a DIRTY working tree — uncommitted server edits are refused
#      with a clear message (this is what previously jammed the loop forever).
#   2. BUILD before swapping containers — a build failure (e.g. dev pushed code
#      that doesn't compile) leaves the running containers completely untouched.
#   3. HEALTH-CHECK after swapping — if the new release doesn't come up healthy,
#      automatically ROLL BACK to the previous good commit and rebuild.
#   4. flock (in cron) prevents overlapping runs.
#
# Server-side change workflow (IMPORTANT):
#   - Edit, then COMMIT on the server (never leave the tree dirty).
#   - Prefer putting deploy-only config in UNTRACKED files (.env,
#     docker-compose.override.yml) so it never conflicts with the dev's pushes.
#   - If you change tracked app code on the server, also push it to origin/main
#     (or hand it to the dev) so it doesn't diverge and cause future rebase
#     conflicts. A genuine conflict makes this script abort safely (prod keeps
#     running) and log "rebase conflict ... Manual review needed".
#
# Invoked every 3 minutes by cron (see /etc/cron.d/voqly-auto-deploy).

set -uo pipefail

REPO="/projects/voqly"
LOG="$REPO/deploy.log"
BRANCH="main"
HEALTH_TIMEOUT=90          # seconds to wait for the new release to become healthy
BACKEND_HEALTH="http://localhost:8010/"
FRONTEND_HEALTH="http://localhost:3000/"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

cd "$REPO" || { echo "repo missing" >> "$LOG"; exit 1; }

# ── 1. Fetch latest from GitHub ──────────────────────────────────────────────
if ! git fetch -q origin "$BRANCH" 2>>"$LOG"; then
  log "ERROR: git fetch failed"
  exit 1
fi

# Nothing new pushed → nothing to do.
if git merge-base --is-ancestor "origin/$BRANCH" HEAD 2>/dev/null; then
  exit 0
fi

# ── 2. Refuse to deploy over uncommitted server changes ──────────────────────
# A dirty tree would make `git rebase` fail every run and wedge the loop. Commit
# (or stash) server edits first. Untracked files are fine and ignored here.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  log "ERROR: uncommitted server changes present — refusing to deploy. Commit or stash them, then it will resume. (git status:)"
  git status --short --untracked-files=no >>"$LOG" 2>&1
  exit 1
fi

NEW_SHA=$(git rev-parse --short "origin/$BRANCH")
PREV_HEAD=$(git rev-parse HEAD)          # last-known-good, for rollback
log "New commit on origin/$BRANCH ($NEW_SHA) detected; redeploying (rollback point: $(git rev-parse --short "$PREV_HEAD"))."

# ── 3. Replay any local server commits on top of the new origin/main ─────────
if ! git rebase "origin/$BRANCH" >>"$LOG" 2>&1; then
  git rebase --abort 2>>"$LOG"
  log "ERROR: rebase conflict (GitHub changed a file the server also changed). Aborted; prod untouched. Manual review needed."
  exit 1
fi

# ── 4. BUILD first — validate before touching running containers ─────────────
# If the dev pushed code that doesn't build, this fails here and the live
# containers keep running unchanged. We roll the code back so the next poll
# doesn't keep trying to redeploy a broken commit.
if ! docker compose build >>"$LOG" 2>&1; then
  log "ERROR: build failed for $(git rev-parse --short HEAD) (dev likely pushed broken code). Prod untouched; rolling code back to $(git rev-parse --short "$PREV_HEAD")."
  git reset --hard "$PREV_HEAD" >>"$LOG" 2>&1
  exit 1
fi

# ── 5. Swap to the freshly built images ──────────────────────────────────────
if ! docker compose up -d >>"$LOG" 2>&1; then
  log "ERROR: 'docker compose up -d' failed. Rolling back to $(git rev-parse --short "$PREV_HEAD")."
  git reset --hard "$PREV_HEAD" >>"$LOG" 2>&1
  docker compose up -d --build >>"$LOG" 2>&1
  exit 1
fi

# ── 6. Health-check the new release; roll back if it never comes up ──────────
healthy=0
for _ in $(seq 1 "$HEALTH_TIMEOUT"); do
  if curl -sf -o /dev/null --max-time 3 "$BACKEND_HEALTH" \
     && curl -sf -o /dev/null --max-time 3 "$FRONTEND_HEALTH"; then
    healthy=1
    break
  fi
  sleep 1
done

if [ "$healthy" -ne 1 ]; then
  log "CRITICAL: new release ($(git rev-parse --short HEAD)) failed health check after ${HEALTH_TIMEOUT}s. Rolling back to $(git rev-parse --short "$PREV_HEAD")."
  git reset --hard "$PREV_HEAD" >>"$LOG" 2>&1
  if docker compose up -d --build >>"$LOG" 2>&1; then
    log "Rollback complete: restored $(git rev-parse --short HEAD)."
  else
    log "CRITICAL: rollback build ALSO failed — manual intervention required."
  fi
  exit 1
fi

log "Deploy complete and healthy: now at $(git rev-parse --short HEAD)."
docker image prune -f >>"$LOG" 2>&1
