<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("superappOrgInviteTitle", organization.name) preheader=msg("superappOrgInviteTitle", organization.name)>
<p style="margin:0 0 8px 0;">${msg("superappOrgInviteIntro", organization.name, realmName)}</p>
<@layout.button href=link label=msg("superappOrgInviteCta")/>
<@layout.note text=msg("superappLinkExpires", linkExpirationFormatter(linkExpiration))/>
</@layout.emailLayout>
