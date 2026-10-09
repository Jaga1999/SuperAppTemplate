<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("superappTestTitle") preheader=msg("superappTestTitle")>
<p style="margin:0;">${msg("superappTestIntro", realmName)}</p>
</@layout.emailLayout>
