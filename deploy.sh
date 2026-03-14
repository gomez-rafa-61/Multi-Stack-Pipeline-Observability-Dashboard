#!/usr/bin/env bash
# =============================================================================
# Azure Web App Container Deployment Script
# Deploys the UAM Pipeline Observability Dashboard to Azure Web App
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SUBSCRIPTION_ID="a197b225-650b-40d3-83ca-86c69f49e84a"
RESOURCE_GROUP="uam-rg-dev"
LOCATION="eastus2"

APP_SERVICE_PLAN="dev-uam-asp"
WEB_APP_NAME="dev-uam-app"
ACR_NAME="uamacrdev"
IMAGE_NAME="uam-dashboard"
IMAGE_TAG="latest"

KEY_VAULT_NAME="dev-uam-kv"

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
info()  { echo -e "\n\033[1;34m>>> $*\033[0m"; }
ok()    { echo -e "\033[1;32m    ✓ $*\033[0m"; }
warn()  { echo -e "\033[1;33m    ⚠ $*\033[0m"; }
error() { echo -e "\033[1;31m    ✗ $*\033[0m" >&2; }

# ---------------------------------------------------------------------------
# 1. Set subscription scope
# ---------------------------------------------------------------------------
info "Setting subscription to ${SUBSCRIPTION_ID}"
az account set --subscription "$SUBSCRIPTION_ID"
ok "Subscription set"

# ---------------------------------------------------------------------------
# 2. Create App Service Plan (Linux, Standard S1)
# ---------------------------------------------------------------------------
info "Creating App Service Plan: ${APP_SERVICE_PLAN}"
az appservice plan create \
  --name "$APP_SERVICE_PLAN" \
  --resource-group "$RESOURCE_GROUP" \
  --is-linux \
  --sku S1 \
  --location "$LOCATION" \
  --output none
ok "App Service Plan created"

# ---------------------------------------------------------------------------
# 3. Build and push the combined Docker image to ACR
# ---------------------------------------------------------------------------
info "Building image ${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG} via ACR Build"
az acr build \
  --registry "$ACR_NAME" \
  --image "${IMAGE_NAME}:${IMAGE_TAG}" \
  --file Dockerfile.azure \
  .
ok "Image built and pushed to ACR"

# ---------------------------------------------------------------------------
# 4. Create the Web App for Containers
# ---------------------------------------------------------------------------
info "Creating Web App: ${WEB_APP_NAME}"
az webapp create \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_SERVICE_PLAN" \
  --container-image-name "${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}" \
  --output none
ok "Web App created"

# ---------------------------------------------------------------------------
# 5. Enable System-Assigned Managed Identity
# ---------------------------------------------------------------------------
info "Enabling system-assigned Managed Identity on ${WEB_APP_NAME}"
PRINCIPAL_ID=$(az webapp identity assign \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query principalId -o tsv)
ok "Managed Identity enabled — principalId: ${PRINCIPAL_ID}"

# ---------------------------------------------------------------------------
# 6. Grant ACR Pull access to the Web App Managed Identity
# ---------------------------------------------------------------------------
info "Granting AcrPull role to Web App on ${ACR_NAME}"
ACR_ID=$(az acr show --name "$ACR_NAME" --query id -o tsv)

az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role AcrPull \
  --scope "$ACR_ID" \
  --output none 2>/dev/null || warn "AcrPull role may already be assigned"
ok "AcrPull role assigned"

# ---------------------------------------------------------------------------
# 7. Configure Web App to pull from ACR using Managed Identity
# ---------------------------------------------------------------------------
info "Configuring ACR pull with Managed Identity credentials"
az webapp config set \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --generic-configurations '{"acrUseManagedIdentityCreds": true}' \
  --output none

az webapp config appsettings set \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings WEBSITES_PORT=8080 \
  --output none
ok "ACR Managed Identity pull configured"

# ---------------------------------------------------------------------------
# 8. Create Key Vault (RBAC-based authorization)
# ---------------------------------------------------------------------------
info "Creating Key Vault: ${KEY_VAULT_NAME}"
az keyvault create \
  --name "$KEY_VAULT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --enable-rbac-authorization true \
  --output none
ok "Key Vault created"

# ---------------------------------------------------------------------------
# 9. Grant yourself Key Vault Secrets Officer (to write secrets)
# ---------------------------------------------------------------------------
info "Granting Key Vault Secrets Officer to current user"
MY_OBJECT_ID=$(az ad signed-in-user show --query id -o tsv)
KV_RESOURCE_ID="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.KeyVault/vaults/${KEY_VAULT_NAME}"

az role assignment create \
  --assignee "$MY_OBJECT_ID" \
  --role "Key Vault Secrets Officer" \
  --scope "$KV_RESOURCE_ID" \
  --output none 2>/dev/null || warn "Role may already be assigned"
ok "Key Vault Secrets Officer granted"

info "Waiting 30s for RBAC propagation..."
sleep 30

# ---------------------------------------------------------------------------
# 10. Populate secrets in Key Vault
# ---------------------------------------------------------------------------
info "Storing Snowflake secrets in Key Vault"
warn "ACTION REQUIRED: Update the snowflake-password value below before running!"

az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name snowflake-account   --value "zb45354.east-us-2.azure"     --output none
az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name snowflake-user      --value "SVC_MSPWRAPP_PRD@CURALEAF.COM" --output none
az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name snowflake-warehouse --value "WH_POWERAPP_PRD"             --output none
az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name snowflake-database  --value "PRD_EDW_STG"                 --output none
az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name snowflake-schema    --value "UAM_MONITORING"              --output none
az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name snowflake-role      --value "UAM_MONITOR_ROLE"            --output none

# Prompt for the password interactively to avoid hardcoding
if [ -t 0 ]; then
  read -rsp "Enter SNOWFLAKE_PASSWORD: " SF_PASSWORD
  echo
  az keyvault secret set --vault-name "$KEY_VAULT_NAME" --name snowflake-password --value "$SF_PASSWORD" --output none
  unset SF_PASSWORD
else
  warn "Non-interactive mode: set snowflake-password manually:"
  warn "  az keyvault secret set --vault-name ${KEY_VAULT_NAME} --name snowflake-password --value '<PASSWORD>'"
fi

ok "Secrets stored in Key Vault"

# ---------------------------------------------------------------------------
# 11. Grant Web App Managed Identity Key Vault Secrets User
# ---------------------------------------------------------------------------
info "Granting Key Vault Secrets User to Web App Managed Identity"
az role assignment create \
  --assignee "$PRINCIPAL_ID" \
  --role "Key Vault Secrets User" \
  --scope "$KV_RESOURCE_ID" \
  --output none 2>/dev/null || warn "Role may already be assigned"
ok "Key Vault Secrets User granted"

# ---------------------------------------------------------------------------
# 12. Wire Key Vault references into Web App app settings
# ---------------------------------------------------------------------------
info "Configuring app settings with Key Vault references"
KV_URI="https://${KEY_VAULT_NAME}.vault.azure.net/secrets"

az webapp config appsettings set \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings \
    SNOWFLAKE_ACCOUNT="@Microsoft.KeyVault(SecretUri=${KV_URI}/snowflake-account/)" \
    SNOWFLAKE_USER="@Microsoft.KeyVault(SecretUri=${KV_URI}/snowflake-user/)" \
    SNOWFLAKE_PASSWORD="@Microsoft.KeyVault(SecretUri=${KV_URI}/snowflake-password/)" \
    SNOWFLAKE_WAREHOUSE="@Microsoft.KeyVault(SecretUri=${KV_URI}/snowflake-warehouse/)" \
    SNOWFLAKE_DATABASE="@Microsoft.KeyVault(SecretUri=${KV_URI}/snowflake-database/)" \
    SNOWFLAKE_SCHEMA="@Microsoft.KeyVault(SecretUri=${KV_URI}/snowflake-schema/)" \
    SNOWFLAKE_ROLE="@Microsoft.KeyVault(SecretUri=${KV_URI}/snowflake-role/)" \
    CORS_ORIGINS="https://${WEB_APP_NAME}.azurewebsites.net" \
    WEBSITES_PORT=8080 \
  --output none
ok "App settings configured with Key Vault references"

# ---------------------------------------------------------------------------
# 13. Enable HTTPS-only and harden TLS
# ---------------------------------------------------------------------------
info "Enabling HTTPS-only and TLS 1.2 minimum"
az webapp update \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --https-only true \
  --output none

az webapp config set \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --min-tls-version 1.2 \
  --ftps-state Disabled \
  --output none
ok "HTTPS-only and TLS hardening applied"

# ---------------------------------------------------------------------------
# 14. Restart and verify
# ---------------------------------------------------------------------------
info "Restarting Web App"
az webapp restart \
  --name "$WEB_APP_NAME" \
  --resource-group "$RESOURCE_GROUP"
ok "Restart triggered"

info "Waiting 20s for container startup..."
sleep 20

info "Verifying deployment"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${WEB_APP_NAME}.azurewebsites.net/api/health" || true)

if [ "$HTTP_STATUS" = "200" ]; then
  ok "Health check returned 200 — deployment successful!"
else
  warn "Health check returned HTTP ${HTTP_STATUS} — container may still be starting."
  warn "Check logs with: az webapp log tail --name ${WEB_APP_NAME} --resource-group ${RESOURCE_GROUP}"
fi

# ---------------------------------------------------------------------------
# Post-deployment reminders
# ---------------------------------------------------------------------------
echo ""
info "=============================================="
info " ACTION REQUIRED — Review these items:"
info "=============================================="
echo ""
echo "  1. AZURE POLICY: Review policies on ${RESOURCE_GROUP}:"
echo "     az policy assignment list --resource-group ${RESOURCE_GROUP} -o table"
echo ""
echo "  2. DIAGNOSTIC LOGGING: Enable log streaming to Log Analytics:"
echo "     az monitor diagnostic-settings create \\"
echo "       --name dev-uam-diag \\"
echo "       --resource \"/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Web/sites/${WEB_APP_NAME}\" \\"
echo "       --logs '[{\"category\":\"AppServiceHTTPLogs\",\"enabled\":true},{\"category\":\"AppServiceConsoleLogs\",\"enabled\":true}]' \\"
echo "       --workspace <LOG_ANALYTICS_WORKSPACE_ID>"
echo ""
echo "  3. CUSTOM DOMAIN (optional): Bind a custom domain and SSL cert."
echo ""
echo "  Dashboard URL: https://${WEB_APP_NAME}.azurewebsites.net"
echo ""
