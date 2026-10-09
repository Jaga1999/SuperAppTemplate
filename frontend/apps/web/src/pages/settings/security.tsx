import { format, parseISO } from 'date-fns'
import { FingerprintIcon, KeyRoundIcon, LinkIcon, LockKeyholeIcon, PlusIcon, ShieldCheckIcon, SmartphoneIcon, TicketIcon, Trash2Icon, UnlinkIcon, UsbIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { GoogleIcon } from '@superapp/ui/components/brand/google-icon'
import { Badge } from '@superapp/ui/components/badge'
import { Button } from '@superapp/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@superapp/ui/components/card'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@superapp/ui/components/item'
import { Skeleton } from '@superapp/ui/components/skeleton'
import { auth } from '../../lib/auth'
import { useSecurity, useUnlinkProvider } from '../../lib/queries'
import type { Credential } from '../../lib/types'

const credentialMeta: Record<string, { icon: ReactNode; name: string }> = {
  otp: { icon: <SmartphoneIcon />, name: 'Authenticator app' },
  'webauthn-passwordless': { icon: <FingerprintIcon />, name: 'Passkey' },
  webauthn: { icon: <UsbIcon />, name: 'Security key' },
  'recovery-authn-codes': { icon: <TicketIcon />, name: 'Recovery codes' },
}

/**
 * Security settings. Adding or removing any sign-in method happens on the themed Keycloak pages
 * (application-initiated actions); this page shows state and starts those flows.
 */
export function SecuritySettings() {
  const { data: security, isPending } = useSecurity()
  const unlink = useUnlinkProvider()

  if (isPending || !security) {
    return <div className="grid gap-6">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div>
  }

  const mfaOn = security.totpEnabled || security.securityKeys > 0
  const byType = (type: string) => security.credentials.filter((c) => c.type === type)

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Sign-in protection
            {mfaOn || security.passkeys > 0 ? (
              <Badge className="bg-success/12 text-success gap-1 border-0"><ShieldCheckIcon className="size-3" />Strong</Badge>
            ) : (
              <Badge variant="outline">Basic</Badge>
            )}
          </CardTitle>
          <CardDescription>Passkeys are the safest and fastest way in. Two-step verification adds a second check after your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <ItemGroup className="gap-3">
            <Item variant="outline">
              <ItemMedia variant="icon"><LockKeyholeIcon /></ItemMedia>
              <ItemContent>
                <ItemTitle>Password</ItemTitle>
                <ItemDescription>{security.hasPassword ? 'Set' : 'Not set: you sign in with Google or a passkey'}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button variant="outline" size="sm" onClick={() => auth.runAction('UPDATE_PASSWORD')}>{security.hasPassword ? 'Change' : 'Set password'}</Button>
              </ItemActions>
            </Item>

            <MethodGroup
              icon={<FingerprintIcon />}
              title="Passkeys"
              description="Sign in with your fingerprint, face or screen lock. No password needed."
              credentials={byType('webauthn-passwordless')}
              addLabel="Add passkey"
              onAdd={() => auth.runAction('webauthn-register-passwordless')}
            />
            <MethodGroup
              icon={<SmartphoneIcon />}
              title="Authenticator app"
              description="Codes from Google Authenticator, 1Password, Microsoft Authenticator…"
              credentials={byType('otp')}
              addLabel={security.totpEnabled ? 'Add another' : 'Set up'}
              onAdd={() => auth.runAction('CONFIGURE_TOTP')}
            />
            <MethodGroup
              icon={<UsbIcon />}
              title="Security keys"
              description="A hardware key (YubiKey, Titan) as your second step."
              credentials={byType('webauthn')}
              addLabel="Add key"
              onAdd={() => auth.runAction('webauthn-register')}
            />
            <Item variant="outline">
              <ItemMedia variant="icon"><TicketIcon /></ItemMedia>
              <ItemContent>
                <ItemTitle>Recovery codes</ItemTitle>
                <ItemDescription>One-time codes for when you lose your phone or key.</ItemDescription>
              </ItemContent>
              <ItemActions>
                {security.recoveryCodes && <Badge variant="secondary">Active</Badge>}
                <Button variant="outline" size="sm" onClick={() => auth.runAction('CONFIGURE_RECOVERY_AUTHN_CODES')}>
                  {security.recoveryCodes ? 'Regenerate' : 'Generate'}
                </Button>
              </ItemActions>
            </Item>
          </ItemGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected accounts</CardTitle>
          <CardDescription>Sign in with another provider instead of a password.</CardDescription>
        </CardHeader>
        <CardContent>
          <ItemGroup className="gap-3">
            {security.linkedProviders.map((p) => (
              <Item key={p.alias} variant="outline">
                <ItemMedia variant="icon">{p.alias === 'google' ? <GoogleIcon className="size-4" /> : <LinkIcon />}</ItemMedia>
                <ItemContent>
                  <ItemTitle className="capitalize">{p.alias}</ItemTitle>
                  <ItemDescription>{p.username ?? 'Connected'}</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="outline" size="sm" disabled={unlink.isPending} onClick={() => unlink.mutate(p.alias)}><UnlinkIcon />Disconnect</Button>
                </ItemActions>
              </Item>
            ))}
            {security.linkableProviders.includes('google') && (
              <Item variant="outline">
                <ItemMedia variant="icon"><GoogleIcon className="size-4" /></ItemMedia>
                <ItemContent>
                  <ItemTitle>Google</ItemTitle>
                  <ItemDescription>Not connected</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button variant="outline" size="sm" onClick={() => auth.runAction('idp_link:google')}><LinkIcon />Connect</Button>
                </ItemActions>
              </Item>
            )}
            {security.linkedProviders.length === 0 && security.linkableProviders.length === 0 && (
              <p className="text-muted-foreground text-sm">No external providers are enabled.</p>
            )}
          </ItemGroup>
        </CardContent>
      </Card>
    </div>
  )
}

function MethodGroup({ icon, title, description, credentials, addLabel, onAdd }: { icon: ReactNode; title: string; description: string; credentials: Credential[]; addLabel: string; onAdd: () => void }) {
  return (
    <div className="rounded-xl border">
      <Item>
        <ItemMedia variant="icon">{icon}</ItemMedia>
        <ItemContent>
          <ItemTitle>
            {title}
            {credentials.length > 0 && <Badge variant="secondary">{credentials.length}</Badge>}
          </ItemTitle>
          <ItemDescription>{description}</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="outline" size="sm" onClick={onAdd}><PlusIcon />{addLabel}</Button>
        </ItemActions>
      </Item>
      {credentials.length > 0 && (
        <ul className="divide-y border-t">
          {credentials.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <KeyRoundIcon className="text-muted-foreground size-4" />
              <span className="flex-1 truncate">{c.label || credentialMeta[c.type]?.name || c.type}</span>
              {c.createdAt && <span className="text-muted-foreground hidden text-xs sm:inline">Added {format(parseISO(c.createdAt), 'MMM d, yyyy')}</span>}
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${c.label ?? title}`} onClick={() => auth.runAction(`delete_credential:${c.id}`)}>
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
