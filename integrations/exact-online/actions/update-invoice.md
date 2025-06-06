<!-- BEGIN GENERATED CONTENT -->
# Update Invoice

## General Information

- **Description:** Updates an invoice in ExactOnline

- **Version:** 1.0.1
- **Group:** Invoices
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ExactInvoiceUpdateOutput`
- **Input Model:** `ExactInvoiceUpdateInput`
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
  "currency?": "<EUR>",
  "description?": "<string>",
  "createdAt?": "<date>"
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

