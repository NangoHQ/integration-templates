<!-- BEGIN GENERATED CONTENT -->
# Update Invoice

## General Information

- **Description:** Updates an invoice in ExactOnline
- **Version:** 2.0.0
- **Group:** Invoices
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_exact_online_updateinvoice`
- **Input Model:** `ActionInput_exact_online_updateinvoice`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/exact-online/actions/update-invoice.ts)


## Endpoint Reference

### Request Endpoint

`PUT /invoices`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "deliverTo?": "<string>",
  "currency?": "<string>",
  "description?": "<string>",
  "createdAt?": "<Date>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/exact-online/actions/update-invoice.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/exact-online/actions/update-invoice.md)

<!-- END  GENERATED CONTENT -->

