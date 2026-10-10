import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'

/**
 * Legal documents, read on the server from legal/*.md in this project (./legal from the working directory, in
 * development and in the Docker image alike; LEGAL_DIR overrides it). Keycloak keeps its own copy in keycloak/legal
 * for the consent step: keep both identical. The e2e suite fails if their versions differ.
 */
export type LegalDocKind = 'terms' | 'privacy'

export type LegalDoc = { title: string; version: string; effective: string; body: string }

const FILES: Record<LegalDocKind, string> = {
  terms: 'terms-and-conditions.md',
  privacy: 'privacy-policy.md',
}

// Read at runtime only (not traced into the build output).
const legalDir = () => process.env.LEGAL_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), 'legal')

/** Parsed once per request, however many components ask for it. */
export const readLegalDoc = cache(async (kind: LegalDocKind): Promise<LegalDoc> => {
  const source = await readFile(path.join(/*turbopackIgnore: true*/ legalDir(), FILES[kind]), 'utf8')
  return parse(source)
})

function parse(source: string): LegalDoc {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(source)
  const meta = Object.fromEntries(
    (match?.[1] ?? '')
      .split(/\r?\n/)
      .map((line) => line.split(/:(.*)/s).map((part) => part.trim().replace(/^["']|["']$/g, '')))
      .filter(([key]) => key),
  )
  return { title: meta.title ?? '', version: meta.version ?? '', effective: meta.effective ?? '', body: match?.[2] ?? source }
}
