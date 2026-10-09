<#-- Shared body for every security notification (event-*.ftl). -->
<#import "template.ftl" as layout>
<#macro alert titleKey bodyKey args=[]>
<@layout.emailLayout title=msg(titleKey) preheader=msg(titleKey)>
<p style="margin:0 0 16px 0;">${msg(bodyKey)}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e4e4e7;border-radius:12px;font-size:13px;">
  <tr><td style="padding:10px 14px;color:#71717a;width:110px;">${msg("superappAlertWhen")}</td><td style="padding:10px 14px;color:#18181b;">${event.date?datetime}</td></tr>
  <#if event.ipAddress??>
  <tr><td style="padding:10px 14px;color:#71717a;border-top:1px solid #e4e4e7;">${msg("superappAlertIp")}</td><td style="padding:10px 14px;color:#18181b;border-top:1px solid #e4e4e7;">${event.ipAddress}</td></tr>
  </#if>
  <#list args as a>
  <tr><td style="padding:10px 14px;color:#71717a;border-top:1px solid #e4e4e7;">${a[0]}</td><td style="padding:10px 14px;color:#18181b;border-top:1px solid #e4e4e7;">${a[1]}</td></tr>
  </#list>
</table>
<@layout.note text=msg("superappAlertNotYou")/>
</@layout.emailLayout>
</#macro>
