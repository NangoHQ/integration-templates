<!-- BEGIN GENERATED CONTENT -->
# Customer Update

## General Information

- **Description:** Updates a customer in Netsuite
- **Version:** 1.0.1
- **Group:** Customers
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `NetsuiteCustomerUpdateOutput`
- **Input Model:** `NetsuiteCustomerUpdateInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/customer-update.ts)


## Endpoint Reference

### Request Endpoint

`PUT /customers`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "externalId": "<string>",
  "name": "<string>",
  "email?": "<string>",
  "taxNumber?": "<string>",
  "addressLine1?": "<string>",
  "addressLine2?": "<string>",
  "city?": "<string>",
  "zip?": "<string>",
  "country?": "<string>",
  "state?": "<string>",
  "phone?": "<string>",
  "id": "<string>",
  "name?": "<string>",
  "externalId?": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/customer-update.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/customer-update.md)

<!-- END  GENERATED CONTENT -->

