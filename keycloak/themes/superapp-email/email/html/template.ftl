<#--
  SuperApp email layout. Table-based + inline styles for broad email-client support.
  Colors mirror the frontend design tokens (frontend/src/index.css).
  Usage:
    <@layout.emailLayout title="…" preheader="…"> …body… </@layout.emailLayout>
    <@layout.button href=link label="…"/>
-->
<#macro emailLayout title="" preheader="">
<!doctype html>
<html lang="${locale.language}" dir="${(ltr)?then('ltr','rtl')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
          <tr>
            <td style="padding:0 4px 24px 4px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:32px;height:32px;border-radius:9px;background:#4f46e5;background-image:linear-gradient(135deg,#6366f1,#4338ca);text-align:center;vertical-align:middle;color:#ffffff;font-weight:700;font-size:16px;">&#10003;</td>
                  <td style="padding-left:10px;font-size:17px;font-weight:650;letter-spacing:-0.01em;color:#18181b;">${realmName!"SuperApp"}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;padding:36px 32px;">
              <#if title?has_content>
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:650;letter-spacing:-0.02em;color:#09090b;">${title}</h1>
              </#if>
              <div style="font-size:15px;line-height:1.65;color:#3f3f46;">
                <#nested>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 0 8px;font-size:12px;line-height:1.6;color:#71717a;text-align:center;">
              ${msg("superappFooter", realmName!"SuperApp")?no_esc}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
</#macro>

<#macro button href label>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
  <tr>
    <td style="border-radius:10px;background:#4f46e5;">
      <a href="${href}" target="_blank" rel="noopener"
         style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 4px 0;font-size:12px;color:#71717a;">${msg("superappLinkFallback")}</p>
<p style="margin:0 0 20px 0;font-size:12px;word-break:break-all;"><a href="${href}" style="color:#4f46e5;">${href}</a></p>
</#macro>

<#macro note text>
<p style="margin:20px 0 0 0;padding:12px 14px;border-radius:10px;background:#f4f4f5;font-size:13px;color:#52525b;">${text}</p>
</#macro>
