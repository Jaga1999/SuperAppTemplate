<#import "security-alert.ftl" as sec>
<@sec.alert titleKey="superappAlertRemoveCredentialTitle" bodyKey="superappAlertRemoveCredentialBody" args=[[msg("superappAlertCredentialType"), event.getDetail("credential_type")!"—"]]/>
