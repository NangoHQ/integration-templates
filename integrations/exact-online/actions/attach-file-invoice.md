<!-- BEGIN GENERATED CONTENT -->
# Attach File Invoice

## General Information

- **Description:** Uploads a file to ExactOnline and link it to an invoice
- **Version:** 2.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_exact_online_attachfileinvoice`
- **Input Model:** `ActionInput_exact_online_attachfileinvoice`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/exact-online/actions/attach-file-invoice.ts)


## Endpoint Reference

### Request Endpoint

`POST /invoices/attach-file`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "invoiceId": "<string>",
  "customerId": "<string>",
  "subject": "<string>",
  "filename": "<string>",
  "content": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/exact-online/actions/attach-file-invoice.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/exact-online/actions/attach-file-invoice.md)

<!-- END  GENERATED CONTENT -->

