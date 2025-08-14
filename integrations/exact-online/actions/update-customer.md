<!-- BEGIN GENERATED CONTENT -->
# Update Customer

## General Information

- **Description:** Updates a customer in ExactOnline
- **Version:** 2.0.0
- **Group:** Customers
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_exact_online_updatecustomer`
- **Input Model:** `ActionInput_exact_online_updatecustomer`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/exact-online/actions/update-customer.ts)


## Endpoint Reference

### Request Endpoint

`PUT /customers`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name?": "<string | null>",
  "email?": "<string | null>",
  "taxNumber?": "<string | null>",
  "addressLine1?": "<string | null>",
  "addressLine2?": "<string | null>",
  "city?": "<string | null>",
  "zip?": "<string | null>",
  "country?": "<string | null>",
  "state?": "<string | null>",
  "phone?": "<string | null>",
  "id": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/exact-online/actions/update-customer.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/exact-online/actions/update-customer.md)

<!-- END  GENERATED CONTENT -->

