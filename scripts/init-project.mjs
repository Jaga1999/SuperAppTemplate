#!/usr/bin/env node
// Turns this template into your own project.
//
//   node scripts/init-project.mjs [project-name] [destination] [--package com.example.app] [--fresh-git] [--dry-run]
//
// In place (no destination): converts this checkout itself, then renames its folder. Run it on a fresh clone.
//   node scripts/init-project.mjs "Acme Shop" --fresh-git
// Into a new folder (destination given): copies the template there (including your .env, docs and the agent setup:
// .claude/, AGENTS.md, CLAUDE.md) and converts only the copy. This checkout stays untouched, so one local template can
// create any number of projects.
//   node scripts/init-project.mjs "Acme Shop" ../acme-shop --fresh-git
//   node scripts/init-project.mjs ../acme-shop --fresh-git          (name taken from the folder name)
// Straight from GitHub, nothing cloned by hand (npm fetches this script, which shallow-clones the template repo set in
// package.json "repository" into a temp folder; the project lands in ./acme-shop unless a destination is given):
//   npx github:<owner>/<repo> "Acme Shop" --fresh-git
//   npx github:<owner>/<repo> "Acme Shop" ./somewhere/acme-shop --fresh-git
// From any git URL or local repository (a fork, another remote):
//   node scripts/init-project.mjs "Acme Shop" ./acme-shop --from https://github.com/<owner>/<repo>.git --fresh-git
//
// project-name     e.g. "acme-shop", "AcmeShop" or "Acme Shop" (letters, digits, spaces, - or _). Optional when a
//                  destination is given (defaults to its folder name); required in place.
// destination      a path: contains / or \ or starts with . (./acme-shop, ../acme-shop, C:\code\acme-shop).
//                  Must not exist yet (or be empty) and must be outside this template.
// --package        Java base package (default: com.<name without separators>, e.g. com.acmeshop)
// --from           git URL or path of the template to clone instead of this checkout (always copies, never in place)
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
// In place, the project folder itself is finally renamed to <project-name> (kebab-case).
// Needs Node 22+ only; no dependencies.

import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const TEMPLATE = 'superapp'
const SKIP_DIRS = new Set(['.git', 'node_modules', 'build', 'dist', 'dist_keycloak', '.next', '.gradle', 'out', '.idea',
  'playwright-report', 'test-results'])
const JAVA_KEYWORDS = new Set(('abstract assert boolean break byte case catch char class const continue default do ' +
  'double else enum extends final finally float for goto if implements import instanceof int interface long native ' +
  'new package private protected public return short static strictfp super switch synchronized this throw throws ' +
  'transient try void volatile while true false null var record yield sealed permits _').split(' '))

/** The checkout (or npm's cached package) this script runs from. */
const scriptHome = path.resolve(import.meta.dirname, '..')
const scriptPath = path.relative(scriptHome, import.meta.filename).split(path.sep).join('/')

function fail(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

// ── Arguments ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--') && !a.includes('=')))
const VALUE_OPTIONS = ['--package', '--from']
const optionValue = (option) => {
  const i = args.indexOf(option)
  if (i >= 0) return args[i + 1]
  return args.find((a) => a.startsWith(`${option}=`))?.slice(option.length + 1)
}
const packageArg = optionValue('--package')
const fromArg = optionValue('--from')
const positional = args.filter((a, i) => !a.startsWith('--') && !VALUE_OPTIONS.includes(args[i - 1]))
// Project names never contain path characters, so anything path-like is the destination.
const isPath = (a) => /[\\/]/.test(a) || a.startsWith('.')
const nameArg = positional.find((a) => !isPath(a))
const destinationArg = positional.find(isPath)
const usage =
  'Usage: node scripts/init-project.mjs [project-name] [destination] [--package com.example.app] [--from <git-url>] [--fresh-git] [--dry-run]'
if (flags.has('--help')) {
  console.log(usage)
  process.exit(0)
}
if (positional.length > 2 || positional.filter(isPath).length > 1 || positional.filter((a) => !isPath(a)).length > 1) {
  fail(`Expected at most one project name and one destination.\n  ${usage}`)
}
if (!nameArg && !destinationArg) fail(`Give a project name, a destination, or both.\n  ${usage}`)
const dryRun = flags.has('--dry-run')
const freshGit = flags.has('--fresh-git')

/** "Acme Shop", "AcmeShop", "acme_shop" → ['acme', 'shop'] */
function wordsOf(text) {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase())
}

// ── Template source ──────────────────────────────────────────────────────────
// Through `npx github:<owner>/<repo>` only this script is installed (package.json "files"), so the template is cloned
// from git: that keeps every committed file exactly, .gitignore files and executable bits included, and nothing else.
const installedCopy = scriptHome.split(path.sep).includes('node_modules')
const cloneUrl = fromArg ?? (installedCopy ? repositoryUrl() : null)
const templateRoot = cloneUrl ? cloneTemplate(cloneUrl) : scriptHome

function repositoryUrl() {
  const pkg = JSON.parse(fs.readFileSync(path.join(scriptHome, 'package.json'), 'utf8'))
  const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
  if (!repo || repo.includes('<owner>')) {
    fail(`Set "repository" in the template's package.json (e.g. "github:you/SuperApp"), or pass --from <git-url>.`)
  }
  const github = /^github:([^/]+\/[^/#]+)$/.exec(repo)
  return github ? `https://github.com/${github[1]}.git` : repo.replace(/^git\+/, '')
}

function cloneTemplate(url) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'superapp-template-'))
  process.on('exit', () => fs.rmSync(temp, { recursive: true, force: true }))
  console.log(`Cloning the template from ${url} …`)
  try {
    execFileSync('git', ['clone', '--quiet', '--depth', '1', url, temp], { stdio: ['ignore', 'ignore', 'inherit'] })
  } catch {
    fail(`Could not clone ${url}. Check the URL and your git access.`)
  }
  return temp
}

// ── Destination ──────────────────────────────────────────────────────────────
// A cloned template is a temporary copy: never convert it in place. Without a destination the project then goes to
// ./<project-name> in the current directory.
const destinationInput = destinationArg ?? (cloneUrl && nameArg ? `./${wordsOf(nameArg).join('-')}` : null)
const destination = destinationInput ? path.resolve(destinationInput) : null
if (destination) {
  const fromTemplate = path.relative(templateRoot, destination)
  if (!fromTemplate || (!fromTemplate.startsWith('..') && !path.isAbsolute(fromTemplate))) {
    fail(`The destination must be outside this template (${templateRoot}).`)
  }
  if (fs.existsSync(destination) && fs.readdirSync(destination).length > 0) {
    fail(`${destination} already exists and is not empty.`)
  }
}
// Dry runs only read, so in destination mode they inspect the template itself.
const root = destination && !dryRun ? destination : templateRoot

// ── Name variants ────────────────────────────────────────────────────────────
const input = (nameArg ?? path.basename(destination)).trim()
if (!/^[A-Za-z][A-Za-z0-9 _-]*$/.test(input)) {
  fail(`"${input}" is not a valid project name: start with a letter; use letters, digits, spaces, - or _.` +
    (nameArg ? '' : ' Pass the name explicitly before the destination.'))
}
const words = wordsOf(input)
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
const templateJava = path.join(templateRoot, 'backend/src/main/java/com', TEMPLATE)
if (!fs.existsSync(templateJava)) {
  fail(`This project has already been initialised (${path.relative(templateRoot, templateJava)} not found).`)
}

console.log(`\nInitialising "${input}" ${destination ? `in ${destination}` : 'in place'}${dryRun ? ' (dry run)' : ''}`)
console.table({
  'folder / realm / ids': name.kebab,
  'classes / UI name': name.pascal,
  'env variables': `${name.upper}_*`,
  'Java package': javaPackage,
  'database name/user': name.snake,
})

// ── Copy (destination mode) ─────────────────────────────────────────────────
// Everything except git history, build output and dependencies: sources, docs, .env (renamed below, git-ignored),
// agent setup (AGENTS.md, CLAUDE.md, .claude/ settings and skills).
if (destination && !dryRun) {
  fs.cpSync(templateRoot, destination, {
    recursive: true,
    filter: (source) => source === templateRoot || !SKIP_DIRS.has(path.basename(source)),
  })
  console.log(`✔ Copied the template to ${destination}`)
}

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
console.log(`✔ ${dryRun ? 'Would update' : 'Updated'} ${changedFiles} files`)

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

// ── .env: every key from .env.example, real secrets instead of CHANGE_ME ────
// Keeps your values; adds keys the template gained since your .env was written; creates .env if there is none.
function secretFor(key) {
  // The cookie key must decode to exactly 32 bytes; everything else is an opaque random string.
  return key === 'BFF_COOKIE_ENCRYPTION_KEY' ? randomBytes(32).toString('base64') : randomBytes(32).toString('base64url')
}
const envPath = path.join(root, '.env')
const examplePath = path.join(root, '.env.example')
if (fs.existsSync(examplePath)) {
  const keyOf = (line) => /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line)?.[1]
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : null
  const present = new Set((existing ?? '').split(/\r?\n/).map(keyOf).filter(Boolean))
  const added = []
  const lines = []
  for (const line of fs.readFileSync(examplePath, 'utf8').split(/\r?\n/)) {
    const key = keyOf(line)
    if (existing !== null && (!key || present.has(key))) continue
    const value = key ? line.slice(line.indexOf('=') + 1) : null
    lines.push(key && value.includes('CHANGE_ME') ? `${key}=${secretFor(key)}` : line)
    if (key) added.push(key)
  }
  if (existing === null) {
    if (!dryRun) fs.writeFileSync(envPath, lines.join('\n'))
    console.log(`✔ ${dryRun ? 'Would create' : 'Created'} .env from .env.example with generated secrets`)
  } else if (added.length > 0) {
    const block = `\n\n# Added by init-project from .env.example (new in the template)\n${lines.join('\n')}\n`
    if (!dryRun) fs.writeFileSync(envPath, existing.replace(/\s*$/, '') + block)
    console.log(`✔ ${dryRun ? 'Would add' : 'Added'} to .env: ${added.join(', ')}`)
  }
}

// The realm name is part of Google's redirect URI, so a renamed project needs it registered on the OAuth client.
const publicUrl = fs.existsSync(envPath)
  ? (/^PUBLIC_URL=(.*)$/m.exec(fs.readFileSync(envPath, 'utf8'))?.[1]?.trim() ?? 'http://localhost:8080')
  : 'http://localhost:8080'
const googleRedirectUri = `${publicUrl}/auth/realms/${name.kebab}/broker/google/endpoint`

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
  // The root package.json only exists so `npx github:<owner>/<repo>` can find this script.
  fs.rmSync(path.join(root, 'package.json'), { force: true })
}

// ── Git ─────────────────────────────────────────────────────────────────────
const git = (...a) => execFileSync('git', a, { cwd: root, stdio: 'inherit' })
if (freshGit && !dryRun) {
  fs.rmSync(path.join(root, '.git'), { recursive: true, force: true })
  git('init', '--quiet', '--initial-branch=main')
  if (process.platform === 'win32') git('config', 'core.longpaths', 'true') // deep paths under long user folders
  git('add', '-A')
  // Windows and npm tarballs don't keep the executable bit; record it so ./gradlew runs after a clone on macOS/Linux.
  git('update-index', '--chmod=+x', 'backend/gradlew')
  git('commit', '--quiet', '-m', `Initial commit: ${name.pascal} from the SuperApp template`)
  console.log('✔ Started a fresh git repository (one initial commit, no remote)')
}

// ── Project folder ──────────────────────────────────────────────────────────
let finalRoot = root
const target = path.join(path.dirname(root), name.kebab)
if (!destination && path.basename(root) !== name.kebab) {
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
${fs.existsSync(path.join(finalRoot, '.env'))
    ? '  review .env                     # copied from the template and renamed; use new secrets for a new product'
    : '  (no .env yet: the next command creates one with generated secrets)'}
  node scripts/start.mjs          # builds, starts and waits until everything is healthy
  then browse to ${publicUrl}

Google sign-in: add this redirect URI to your Google OAuth client (Cloud Console → Credentials), or Google answers
"redirect_uri_mismatch":
  ${googleRedirectUri}
${freshGit ? '' : destination ? `
No git repository was created. Pass --fresh-git next time, or run:  git init
` : `
The git history still belongs to the template. Either re-run on a fresh clone with --fresh-git, or point
"origin" at your own repository:  git remote set-url origin <your-repo-url>
`}`)
