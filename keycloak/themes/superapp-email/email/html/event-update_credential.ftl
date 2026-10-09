<#import "security-alert.ftl" as sec>
<@sec.alert titleKey="superappAlertCredentialTitle" bodyKey="superappAlertCredentialBody" args=[[msg("superappAlertCredentialType"), event.getDetail("credential_type")!"—"]]/>
