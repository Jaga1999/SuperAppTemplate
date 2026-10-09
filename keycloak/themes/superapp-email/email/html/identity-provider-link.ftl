<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("superappIdpLinkTitle", identityProviderDisplayName) preheader=msg("superappIdpLinkPreheader", identityProviderDisplayName)>
<p style="margin:0 0 8px 0;">${msg("superappIdpLinkIntro", identityProviderDisplayName, realmName, identityProviderContext.username)}</p>
<@layout.button href=link label=msg("superappIdpLinkCta", identityProviderDisplayName)/>
<@layout.note text=msg("superappLinkExpires", linkExpirationFormatter(linkExpiration))/>
<p style="margin:16px 0 0 0;font-size:13px;color:#71717a;">${msg("superappNotYou")}</p>
</@layout.emailLayout>
