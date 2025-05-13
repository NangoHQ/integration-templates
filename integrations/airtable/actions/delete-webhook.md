<!-- BEGIN GENERATED CONTENT -->
# Delete Webhook

## General Information

- **Description:** Delete a webhook
- **Version:** 1.0.0
- **Group:** Webhooks
- **Scopes:** `webhook:manage`
- **Endpoint Type:** Action
- **Model:** `SuccessResponse`
- **Input Model:** `DeleteWebhook`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/airtable/actions/delete-webhook.ts)


## Endpoint Reference

### Request Endpoint

`DELETE /webhooks`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "baseId": "<string>",
  "webhookId": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/airtable/actions/delete-webhook.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/airtable/actions/delete-webhook.md)

<!-- END  GENERATED CONTENT -->

