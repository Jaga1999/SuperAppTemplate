#!/usr/bin/env node
// One command for local development. Needs Node 22+ and Docker (Docker Desktop on Windows/macOS).
//
//   node scripts/start.mjs            build + start everything, wait until healthy, print the URLs
//   node scripts/start.mjs status     what is running, and its health
//   node scripts/start.mjs logs [svc] follow logs (all services, or one: backend, keycloak, frontend, nginx, …)
//   node scripts/start.mjs stop       stop everything (data is kept)
//   node scripts/start.mjs reset --yes  stop and DELETE all local data (databases, Kafka, Redis), then start fresh
//
// First run: creates .env from .env.example with freshly generated secrets. Later runs add any key the template gained
// since (your values are never changed). Secrets are never printed: the summary says which .env key holds each one.

import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const envPath = path.join(root, '.env')
const examplePath = path.join(root, '.env.example')
const [command = 'up', ...rest] = process.argv.slice(2)

function fail(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

/** Runs a command in the project root, streaming its output. Returns the exit code. */
function run(cmd, args, { quiet = false } = {}) {
  const result = spawnSync(cmd, args, { cwd: root, stdio: quiet ? 'ignore' : 'inherit' })
  if (result.error) fail(`Could not run "${cmd}": ${result.error.message}`)
  return result.status ?? 1
}

const compose = (...args) => run('docker', ['compose', ...args])

// ── Prerequisites ─────────────────────────────────────────────────────────────
function checkPrerequisites() {
  const [major] = process.versions.node.split('.').map(Number)
  if (major < 22) fail(`Node.js 22 or newer is required (found ${process.versions.node}).`)
  if (run('docker', ['info'], { quiet: true }) !== 0) {
    fail('Docker is not running. Start Docker Desktop (or the Docker daemon) and try again.')
  }
  if (run('docker', ['compose', 'version'], { quiet: true }) !== 0) {
    fail('Docker Compose v2 is required ("docker compose", not "docker-compose").')
  }
}

// ── .env ──────────────────────────────────────────────────────────────────────
function secretFor(key) {
  // The cookie key must decode to exactly 32 bytes; everything else is an opaque random string.
  return key === 'BFF_COOKIE_ENCRYPTION_KEY' ? randomBytes(32).toString('base64') : randomBytes(32).toString('base64url')
}

const keyOf = (line) => /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line)?.[1]

function ensureEnv() {
  if (!fs.existsSync(examplePath)) fail('.env.example is missing.')
  const example = fs.readFileSync(examplePath, 'utf8').split(/\r?\n/)
  const withSecrets = (line) => {
    const key = keyOf(line)
    return key && line.slice(line.indexOf('=') + 1).includes('CHANGE_ME') ? `${key}=${secretFor(key)}` : line
  }
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, example.map(withSecrets).join('\n'))
    console.log('✔ Created .env with generated secrets (review it; add Google/SMTP settings if you use them)')
    return
  }
  const current = fs.readFileSync(envPath, 'utf8')
  const present = new Set(current.split(/\r?\n/).map(keyOf).filter(Boolean))
  const missing = example.filter((line) => keyOf(line) && !present.has(keyOf(line)))
  if (missing.length > 0) {
    const block = `\n\n# Added from .env.example (new in the template)\n${missing.map(withSecrets).join('\n')}\n`
    fs.writeFileSync(envPath, current.replace(/\s*$/, '') + block)
    console.log(`✔ Added to .env: ${missing.map(keyOf).join(', ')}`)
  }
}

function envValue(key, fallback) {
  const match = new RegExp(`^${key}=(.*)$`, 'm').exec(fs.readFileSync(envPath, 'utf8'))
  return match?.[1]?.trim() || fallback
}

// ── Summary ───────────────────────────────────────────────────────────────────
function printSummary() {
  const url = envValue('PUBLIC_URL', 'http://localhost:8080')
  const realm = envValue('KEYCLOAK_REALM', 'superapp')
  const kcAdmin = envValue('KEYCLOAK_BOOTSTRAP_ADMIN_USERNAME', 'admin')
  console.log(`
✔ Everything is up and healthy.

  App (landing, sign-in, app)   ${url}
  Emails (Mailpit inbox)        http://localhost:8025
  API docs (Swagger UI)         http://localhost:8081/swagger-ui.html
  Keycloak admin console        http://localhost:8180/auth   user "${kcAdmin}", password: KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD in .env

  Seed users (realm "${realm}"):
    admin@${realm}.local   role admin   password: SEED_ADMIN_PASSWORD in .env
    user@${realm}.local    role user    password: SEED_USER_PASSWORD in .env
  Or create an account on the sign-up page; the verification email lands in Mailpit.

  Hot reload while the stack runs:
    npm --prefix frontend run dev     → http://localhost:5173   (product app)
    npm --prefix keycloakify run dev  → http://localhost:5174/?kc=login.ftl   (sign-in pages, mock data)

  node scripts/start.mjs status | logs [service] | stop | reset --yes
`)
}

// ── Commands ──────────────────────────────────────────────────────────────────
switch (command) {
  case 'up':
  case 'start': {
    checkPrerequisites()
    ensureEnv()
    console.log('Building and starting the stack (the first run downloads images and can take several minutes)…\n')
    if (compose('up', '-d', '--build', '--wait') !== 0) {
      compose('ps')
      fail('Some services did not become healthy. Inspect them with: node scripts/start.mjs logs <service>')
    }
    printSummary()
    break
  }
  case 'status':
    checkPrerequisites()
    compose('ps', '--format', 'table {{.Service}}\t{{.Status}}\t{{.Ports}}')
    break
  case 'logs':
    checkPrerequisites()
    compose('logs', '-f', '--tail', '200', ...rest)
    break
  case 'stop':
  case 'down':
    checkPrerequisites()
    compose('down')
    break
  case 'reset':
    if (!rest.includes('--yes')) {
      fail('reset deletes ALL local data (users, databases, Kafka, Redis). Run: node scripts/start.mjs reset --yes')
    }
    checkPrerequisites()
    compose('down', '-v', '--remove-orphans')
    ensureEnv()
    if (compose('up', '-d', '--build', '--wait') !== 0) fail('The stack did not become healthy after the reset.')
    printSummary()
    break
  default:
    fail(`Unknown command "${command}". Use: up | status | logs [service] | stop | reset --yes`)
}
