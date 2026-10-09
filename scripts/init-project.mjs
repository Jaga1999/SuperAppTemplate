#!/usr/bin/env node
// Turns this template into your own project, in place. Run once, right after cloning:
//
//   node scripts/init-project.mjs <project-name> [--package com.example.app] [--fresh-git] [--dry-run]
//
// <project-name>   e.g. "acme-shop", "AcmeShop" or "Acme Shop" (letters, digits, spaces, - or _)
// --package        Java base package (default: com.<name without separators>, e.g. com.acmeshop)
// --fresh-git      delete the template's git history and start a new repository with one initial commit
// --dry-run        print what would change, touch nothing
//
// What it renames (every spelling, in file contents and in file/folder names):
//   superapp → acme-shop     realm, clients, themes, Docker images, npm packages, config keys, Kafka groups …
//   superappX→ acmeShopX     camelCase identifiers (bean methods, email message keys)
//   SuperApp → AcmeShop      classes (AcmeShopApplication) and product name in the UI and emails
//   SUPERAPP → ACME_SHOP     environment variables
//   com.superapp → --package Java packages of the backend and the Keycloak extensions
//   database name/user       acme_shop (underscores: no quoting needed in SQL)
// Finally the project folder itself is renamed to <project-name> (kebab-case).
// Needs Node 22+ only; no dependencies.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const TEMPLATE = 'superapp'
const SKIP_DIRS = new Set(['.git', 'node_modules', 'build', 'dist', 'dist_keycloak', '.gradle', 'out', '.idea',
  'playwright-report', 'test-results'])
const JAVA_KEYWORDS = new Set(('abstract assert boolean break byte case catch char class const continue default do ' +
  'double else enum extends final finally float for goto if implements import instanceof int interface long native ' +
  'new package private protected public return short static strictfp super switch synchronized this throw throws ' +
  'transient try void volatile while true false null var record yield sealed permits _').split(' '))

const root = path.resolve(import.meta.dirname, '..')
const scriptPath = path.relative(root, import.meta.filename).split(path.sep).join('/')

function fail(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

// ── Arguments ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--') && !a.includes('=')))
const packageArg = (() => {
  const i = args.indexOf('--package')
  if (i >= 0) return args[i + 1]
  return args.find((a) => a.startsWith('--package='))?.slice('--package='.length)
})()
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--package')
if (positional.length !== 1 || flags.has('--help')) {
  console.log('Usage: node scripts/init-project.mjs <project-name> [--package com.example.app] [--fresh-git] [--dry-run]')
  process.exit(positional.length === 1 ? 0 : 1)
}
const dryRun = flags.has('--dry-run')
const freshGit = flags.has('--fresh-git')

// ── Name variants ────────────────────────────────────────────────────────────
const input = positional[0].trim()
if (!/^[A-Za-z][A-Za-z0-9 _-]*$/.test(input)) {
  fail(`"${input}" is not a valid project name: start with a letter; use letters, digits, spaces, - or _.`)
}
const words = input
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  .split(/[^A-Za-z0-9]+/)
  .filter(Boolean)
  .map((w) => w.toLowerCase())
const cap = (w) => w[0].toUpperCase() + w.slice(1)
const name = {
  kebab: words.join('-'),
  snake: words.join('_'),
  flat: words.join(''),
  camel: words[0] + words.slice(1).map(cap).join(''),
  pascal: words.map(cap).join(''),
  upper: words.join('_').toUpperCase(),
}
if (name.flat === TEMPLATE) fail(`Pick a name other than "${TEMPLATE}".`)

const javaPackage = packageArg ?? `com.${name.flat}`
for (const segment of javaPackage.split('.')) {
  if (!/^[a-z][a-z0-9_]*$/.test(segment) || JAVA_KEYWORDS.has(segment)) {
    fail(`"${javaPackage}" is not a valid Java package (lowercase segments, no keywords).` +
      (packageArg ? '' : ' Pass one with --package com.example.app.'))
  }
}

// ── Guard: run once, on an untouched template ───────────────────────────────
const templateJava = path.join(root, 'backend/src/main/java/com', TEMPLATE)
if (!fs.existsSync(templateJava)) {
  fail(`This project has already been initialised (${path.relative(root, templateJava)} not found).`)
}

console.log(`\nInitialising "${input}"${dryRun ? ' (dry run)' : ''}`)
console.table({
  'folder / realm / ids': name.kebab,
  'classes / UI name': name.pascal,
  'env variables': `${name.upper}_*`,
  'Java package': javaPackage,
  'database name/user': name.snake,
})

// ── Content replacement ─────────────────────────────────────────────────────
const rules = [
  [/com\.superapp\b/g, javaPackage],
  [/com\/superapp\b/g, javaPackage.replaceAll('.', '/')],
  // Postgres names: underscores, so they never need quoting.
  [/\b(APP_DB_(?:NAME|USER)=)superapp\b/g, `$1${name.snake}`],
  [/(:5432\/)superapp\b/g, `$1${name.snake}`],
  [/(APP_DB_USER:)superapp\b/g, `$1${name.snake}`],
  [/superapp(?=[A-Z])/g, name.camel],
  [/SuperApp/g, name.pascal],
  [/SUPERAPP/g, name.upper],
  [/superapp/g, name.kebab],
]

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(path.join(dir, entry.name))
    } else if (entry.isFile()) {
      yield path.join(dir, entry.name)
    }
  }
}

function isBinary(buffer) {
  return buffer.subarray(0, 8000).includes(0)
}

let changedFiles = 0
for (const file of walk(root)) {
  const rel = path.relative(root, file).split(path.sep).join('/')
  if (rel === scriptPath) continue
  const buffer = fs.readFileSync(file)
  if (isBinary(buffer)) continue
  const before = buffer.toString('utf8')
  const after = rules.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), before)
  if (after !== before) {
    changedFiles++
    if (!dryRun) fs.writeFileSync(file, after)
  }
}
console.log(`✔ Updated ${changedFiles} files`)

// ── File and folder names ───────────────────────────────────────────────────
function move(from, to) {
  console.log(`  ${path.relative(root, from)} → ${path.relative(root, to)}`)
  if (dryRun) return
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.renameSync(from, to)
}

// Java source roots: com/superapp → the package path (may be several folders deep).
function* walkDirs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
      const full = path.join(dir, entry.name)
      yield full
      yield* walkDirs(full)
    }
  }
}
const javaRoots = [...walkDirs(root)]
  .filter((d) => path.basename(d) === TEMPLATE && path.basename(path.dirname(d)) === 'com')
  .map((d) => path.dirname(path.dirname(d)))
for (const javaRoot of javaRoots) {
  move(path.join(javaRoot, 'com', TEMPLATE), path.join(javaRoot, ...javaPackage.split('.')))
  if (!dryRun && fs.readdirSync(path.join(javaRoot, 'com')).length === 0) fs.rmdirSync(path.join(javaRoot, 'com'))
}

// Everything else, deepest paths first so parents are renamed after their children.
function collectNamed(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collectNamed(full, out)
    if (/superapp/i.test(entry.name)) out.push(full)
  }
  return out
}
for (const from of collectNamed(root).sort((a, b) => b.length - a.length)) {
  const base = path.basename(from)
    .replace(/SuperApp/g, name.pascal)
    .replace(/SUPERAPP/g, name.upper)
    .replace(/superapp/g, name.kebab)
  move(from, path.join(path.dirname(from), base))
}

// ── Template-only bits ──────────────────────────────────────────────────────
const readme = path.join(root, 'README.md')
if (fs.existsSync(readme) && !dryRun) {
  const text = fs.readFileSync(readme, 'utf8')
  fs.writeFileSync(readme, text.replace(/<!-- template:start -->[\s\S]*?<!-- template:end -->\n*/g, ''))
}
if (!dryRun) {
  fs.rmSync(path.join(root, scriptPath))
  const scriptsDir = path.dirname(path.join(root, scriptPath))
  if (fs.readdirSync(scriptsDir).length === 0) fs.rmdirSync(scriptsDir)
}

// ── Git ─────────────────────────────────────────────────────────────────────
const git = (...a) => execFileSync('git', a, { cwd: root, stdio: 'inherit' })
if (freshGit && !dryRun) {
  fs.rmSync(path.join(root, '.git'), { recursive: true, force: true })
  git('init', '--quiet', '--initial-branch=main')
  if (process.platform === 'win32') git('config', 'core.longpaths', 'true') // deep paths under long user folders
  git('add', '-A')
  git('commit', '--quiet', '-m', `Initial commit: ${name.pascal} from the SuperApp template`)
  console.log('✔ Started a fresh git repository (one initial commit, no remote)')
}

// ── Project folder ──────────────────────────────────────────────────────────
let finalRoot = root
const target = path.join(path.dirname(root), name.kebab)
if (path.basename(root) !== name.kebab) {
  if (fs.existsSync(target)) {
    console.log(`! ${target} already exists; the folder was not renamed.`)
  } else if (!dryRun) {
    try {
      process.chdir(path.dirname(root))
      fs.renameSync(root, target)
      finalRoot = target
      console.log(`✔ Renamed the folder to ${target}`)
    } catch {
      // Windows refuses while a shell or editor has the folder open.
      console.log(`! Could not rename the folder while it is in use. Close editors/terminals inside it, then run:`)
      console.log(`    cd "${path.dirname(root)}"`)
      console.log(`    mv "${path.basename(root)}" "${name.kebab}"        # PowerShell: Rename-Item "${path.basename(root)}" "${name.kebab}"`)
    }
  }
}

console.log(`
Done. Next steps:
  cd "${finalRoot}"
  cp .env.example .env            # then change every CHANGE_ME value
  docker compose up -d --build --wait
  then browse to http://localhost:8080
${freshGit ? '' : `
The git history still belongs to the template. Either re-run on a fresh clone with --fresh-git, or point
"origin" at your own repository:  git remote set-url origin <your-repo-url>
`}`)
