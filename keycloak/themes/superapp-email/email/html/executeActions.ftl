<#outputformat "plainText">
<#assign requiredActionsText><#if requiredActions??><#list requiredActions><#items as reqActionItem>${msg("requiredAction.${reqActionItem}")}<#sep>, </#sep></#items></#list></#if></#assign>
</#outputformat>
<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("superappActionsTitle") preheader=msg("superappActionsPreheader")>
<p style="margin:0 0 8px 0;">${msg("superappActionsIntro", realmName)}</p>
<p style="margin:0;padding:10px 14px;border-radius:10px;border:1px solid #e4e4e7;font-weight:600;color:#18181b;">${requiredActionsText}</p>
<@layout.button href=link label=msg("superappActionsCta")/>
<@layout.note text=msg("superappLinkExpires", linkExpirationFormatter(linkExpiration))/>
</@layout.emailLayout>
