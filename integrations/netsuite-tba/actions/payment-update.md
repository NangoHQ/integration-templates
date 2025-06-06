<!-- BEGIN GENERATED CONTENT -->
# Payment Update

## General Information

- **Description:** Updates a payment in Netsuite
- **Version:** 1.0.1
- **Group:** Payments
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `NetsuitePaymentUpdateOutput`
- **Input Model:** `NetsuitePaymentUpdateInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/payment-update.ts)


## Endpoint Reference

### Request Endpoint

`PUT /payments`

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
  "description?": "<string>",
  "id": "<string>",
  "amount?": "<number>",
  "currency?": "<string>",
  "paymentReference?": "<string>",
  "status?": "<string>",
  "applyTo?": [
    "<string>"
  ]
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/payment-update.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/payment-update.md)

<!-- END  GENERATED CONTENT -->

