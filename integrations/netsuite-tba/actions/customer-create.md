# Customer Create

## General Information

- **Description:** Creates a customer in Netsuite

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/customer-create.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/customers`
- **Method:** `POST`

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
  "phone?": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/customer-create.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/customer-create.md)

<!-- END  GENERATED CONTENT -->

