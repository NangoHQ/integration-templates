# Accounts

## General Information

- **Description:** Fetches a list of accounts from zoho crm

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: ZohoCRM.modules.accounts.READ
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoho-crm/syncs/accounts.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/zoho-crm/accounts`
- **Method:** `GET`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.

### Request Body

_No request body_

### Request Response

```json
{
  "Owner": {
    "name": "<string>",
    "id": "<string>",
    "email": "<string>"
  },
  "$currency_symbol": "<string>",
  "$field_states": "<string>",
  "Account_Type": "<string>",
  "SIC_Code": "<string>",
  "Last_Activity_Time": "<date>",
  "Industry": "<string>",
  "Account_Site": "<string>",
  "$state": "<string>",
  "$process_flow": "<boolean>",
  "Billing_Country": "<string>",
  "$locked_for_me": "<boolean>",
  "id": "<string>",
  "$approved": "<boolean>",
  "$approval": {
    "delegate": "<boolean>",
    "approve": "<boolean>",
    "reject": "<boolean>",
    "resubmit": "<boolean>"
  },
  "Billing_Street": "<string>",
  "Created_Time": "<date>",
  "$editable": "<boolean>",
  "Billing_Code": "<string>",
  "Shipping_City": "<string>",
  "Shipping_Country": "<string>",
  "Shipping_Code": "<string>",
  "Billing_City": "<string>",
  "Created_By": {
    "name": "<string>",
    "id": "<string>",
    "email": "<string>"
  },
  "$zia_owner_assignment": "<string>",
  "Annual_Revenue": "<integer>",
  "Shipping_Street": "<string>",
  "Ownership": "<string>",
  "Description": "<string>",
  "Rating": "<integer>",
  "Shipping_State": "<string>",
  "$review_process": {
    "approve": "<boolean>",
    "reject": "<boolean>",
    "resubmit": "<boolean>"
  },
  "Website": "<string>",
  "Employees": "<integer>",
  "Record_Image": "<string>",
  "Modified_By": {
    "name": "<string>",
    "id": "<string>",
    "email": "<string>"
  },
  "$review": "<string>",
  "Phone": "<string>",
  "Account_Name": "<string>",
  "Account_Number": "<string>",
  "Ticker_Symbol": "<string>",
  "Modified_Time": "<date>",
  "$orchestration": "<boolean>",
  "Parent_Account": {
    "name": "<string>",
    "id": "<string>"
  },
  "$in_merge": "<boolean>",
  "Locked__s": "<boolean>",
  "Billing_State": "<string>",
  "Tag": [
    "<any>"
  ],
  "Fax": "<string>",
  "$approval_state": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-crm/syncs/accounts.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-crm/syncs/accounts.md)
