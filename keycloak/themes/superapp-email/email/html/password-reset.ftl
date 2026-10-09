<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("superappResetTitle") preheader=msg("superappResetPreheader", realmName)>
<p style="margin:0 0 8px 0;">${msg("superappResetIntro", realmName)}</p>
<@layout.button href=link label=msg("superappResetCta")/>
<@layout.note text=msg("superappLinkExpires", linkExpirationFormatter(linkExpiration))/>
<p style="margin:16px 0 0 0;font-size:13px;color:#71717a;">${msg("superappResetIgnore")}</p>
</@layout.emailLayout>
