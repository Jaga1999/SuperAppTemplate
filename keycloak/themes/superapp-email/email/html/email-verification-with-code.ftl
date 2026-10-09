<#import "template.ftl" as layout>
<@layout.emailLayout title=msg("superappVerifyTitle") preheader=msg("superappVerifyCodePreheader")>
<p style="margin:0 0 20px 0;">${msg("superappVerifyCodeIntro")}</p>
<p style="margin:0 0 20px 0;padding:18px;border-radius:12px;background:#f4f4f5;text-align:center;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:0.3em;color:#09090b;">${code}</p>
<p style="margin:16px 0 0 0;font-size:13px;color:#71717a;">${msg("superappNotYou")}</p>
</@layout.emailLayout>
