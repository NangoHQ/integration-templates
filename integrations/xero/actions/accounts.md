# Accounts

## General Information
- **Description:** Fetches all accounts in Xero (chart of accounts). Incremental sync, detects deletes, metadata is not required.

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:**: accounting.settings
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/syncs/accounts.ts)

### Request Endpoint

- **Path:** `/accounts`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "code?": "<string>",
  "name": "<string>",
  "type": "<string>",
  "tax_type": "<string>",
  "description": "<string | null>",
  "class": "<string>",
  "bank_account_type": "<string>",
  "reporting_code": "<string>",
  "reporting_code_name": "<string>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/accounts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/accounts.md)

<!-- END  GENERATED CONTENT -->

undefined