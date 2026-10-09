import { GlobeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { I18n } from '../i18n'

/**
 * Language switcher. Lazy-loaded by the Template only when the realm enables more than one language, so the
 * dropdown's code never weighs on single-language login pages.
 */
export default function LanguageMenu({ i18n }: { i18n: I18n }) {
  const { msgStr, currentLanguage, enabledLanguages } = i18n
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={msgStr('languages')} className="text-muted-foreground gap-1.5">
          <GlobeIcon />
          {currentLanguage.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {enabledLanguages.map(({ languageTag, label, href }) => (
          <DropdownMenuItem key={languageTag} asChild>
            <a href={href}>{label}</a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
