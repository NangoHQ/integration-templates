<!-- BEGIN GENERATED CONTENT -->
# Customers

## General Information

- **Description:** Incrementally fetch all Recharge customers and their subscription details.
- **Version:** 1.0.2
- **Group:** Customers
- **Scopes:** `read_customers, read_subscriptions`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/recharge/syncs/customers.ts)


## Endpoint Reference

### Request Endpoint

`GET /customers`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.
- **ids:** `(optional, string[])` An array of string containing a list of your records IDs. The list will be filtered to include only the records with a matching ID.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "phone_number": "<string | null>",
  "first_name": "<string | null>",
  "last_name": "<string | null>",
  "email": "<string | null>",
  "subscriptions": {
    "0": {
      "id": "<string>",
      "type": "<string>",
      "name": "<string>",
      "start_date": "<string>",
      "end_date": "<string | null>",
      "next_charge_scheduled_at": "<string | null>"
    }
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recharge/syncs/customers.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recharge/syncs/customers.md)

<!-- END  GENERATED CONTENT -->

