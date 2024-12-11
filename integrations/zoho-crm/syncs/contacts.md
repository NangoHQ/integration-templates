# Contacts

## General Information

- **Description:** Fetches a list of contacts from zoho crm

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `ZohoCRM.modules.contacts.READ`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoho-crm/syncs/contacts.ts)


## Endpoint Reference

### Request Endpoint

`GET /zoho-crm/contacts`

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
  "Email": "<string>",
  "$currency_symbol": "<string>",
  "$field_states": "<string>",
  "Other_Phone": "<string>",
  "Mailing_State": "<string>",
  "Other_State": "<string>",
  "Other_Country": "<string>",
  "Last_Activity_Time": "<date>",
  "Department": "<string>",
  "$state": "<string>",
  "Unsubscribed_Mode": "<string>",
  "$process_flow": "<boolean>",
  "Assistant": "<string>",
  "Mailing_Country": "<string>",
  "$locked_for_me": "<string>",
  "id": "<string>",
  "$approved": "<boolean>",
  "Reporting_To": {
    "name": "<string>",
    "id": "<string>"
  },
  "$approval": {
    "delegate": "<boolean>",
    "approve": "<boolean>",
    "reject": "<boolean>",
    "resubmit": "<boolean>"
  },
  "Other_City": "<string>",
  "Created_Time": "<date>",
  "$editable": "<boolean>",
  "Home_Phone": "<string>",
  "Created_By": {
    "name": "<string>",
    "id": "<string>",
    "email": "<string>"
  },
  "$zia_owner_assignment": "<string>",
  "Secondary_Email": "<string>",
  "Description": "<string>",
  "Vendor_Name": {
    "name": "<string>",
    "id": "<string>"
  },
  "Mailing_Zip": "<string>",
  "$review_process": {
    "approve": "<boolean>",
    "reject": "<boolean>",
    "resubmit": "<boolean>"
  },
  "Twitter": "<string>",
  "Other_Zip": "<string>",
  "Mailing_Street": "<string>",
  "Salutation": "<string>",
  "First_Name": "<string>",
  "Full_Name": "<string>",
  "Asst_Phone": "<string>",
  "Record_Image": "<string>",
  "Modified_By": {
    "name": "<string>",
    "id": "<string>",
    "email": "<string>"
  },
  "$review": "<boolean>",
  "Skype_ID": "<string>",
  "Phone": "<string>",
  "Account_Name": {
    "name": "<string>",
    "id": "<string>"
  },
  "Email_Opt_Out": "<boolean>",
  "Modified_Time": "<date>",
  "Date_of_Birth": "<date>",
  "Mailing_City": "<string>",
  "Unsubscribed_Time": "<date>",
  "Title": "<string>",
  "Other_Street": "<string>",
  "Mobile": "<string>",
  "$orchestration": "<boolean>",
  "Last_Name": "<string>",
  "$in_merge": "<boolean>",
  "Locked__s": "<boolean>",
  "Lead_Source": "<string>",
  "Tag": [
    "<any>"
  ],
  "Fax": "<string>",
  "$approval_state": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-crm/syncs/contacts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-crm/syncs/contacts.md)

<!-- END  GENERATED CONTENT -->

