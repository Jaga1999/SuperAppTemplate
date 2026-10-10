import type { ExtendKcContext } from 'keycloakify/login'
import type { KcEnvName, ThemeName } from '../kc.gen'

export type KcContextExtension = {
  themeName: ThemeName
  properties: Record<KcEnvName, string> & {}
}

/** One document as sent by the superapp-legal-consent required action (keycloak/extensions). */
export type LegalDocumentView = {
  title: string
  version: string
  effective: string
  summary: string
  /** Version this user accepted before ('' if never). */
  acceptedVersion: string
  /** True when the user accepted an older version: show "Updated". */
  updated: boolean
}

export type KcContextExtensionPerPage = {
  'legal-consent.ftl': { legalTerms: LegalDocumentView; legalPrivacy: LegalDocumentView }
}

export type KcContext = ExtendKcContext<KcContextExtension, KcContextExtensionPerPage>
