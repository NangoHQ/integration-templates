# Payment Create

## General Information

- **Description:** Creates a payment in Netsuite

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/payment-create.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/payments`
- **Method:** `POST`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "customerId": "<string>",
  "amount": "<number>",
  "currency": "<string>",
  "paymentReference": "<string>",
  "applyTo": [
    "<string>"
  ],
  "status": "<string>",
  "description?": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/payment-create.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/payment-create.md)

<!-- END  GENERATED CONTENT -->

