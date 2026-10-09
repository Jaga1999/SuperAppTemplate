<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("superappVerifyTitle") preheader=msg("superappVerifyPreheader", realmName)>
<p style="margin:0 0 8px 0;">${msg("superappVerifyIntro", realmName)}</p>
<@layout.button href=link label=msg("superappVerifyCta")/>
<@layout.note text=msg("superappLinkExpires", linkExpirationFormatter(linkExpiration))/>
<p style="margin:16px 0 0 0;font-size:13px;color:#71717a;">${msg("superappNotYou")}</p>
</@layout.emailLayout>
