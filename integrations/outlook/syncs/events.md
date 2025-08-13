<!-- BEGIN GENERATED CONTENT -->
# Events

## General Information

- **Description:** Sync calendar events on the primary calendar going back as specified in the metadata `backfillPeriodMs`, or fallback to 1 month if not provided.
- **Version:** 2.0.0
- **Group:** Others
- **Scopes:** `Calendars.Read`
- **Endpoint Type:** Sync
- **Model:** `OutlookCalendarEvent`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/outlook/syncs/events.ts)


## Endpoint Reference

### Request Endpoint

`GET /events`

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
  "attendees": [
    {
      "emailAddress": {
        "address": "<string>",
        "name": "<string>"
      },
      "proposedNewTime?": {
        "start": {
          "dateTime": "<string>",
          "timeZone": "<string>"
        },
        "end": {
          "dateTime": "<string>",
          "timeZone": "<string>"
        }
      },
      "status": {
        "response": "<enum: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded'>",
        "sentDateTime": "<string>"
      },
      "type": "<enum: 'required' | 'optional' | 'resource'>"
    }
  ],
  "bodyPreview": "<string>",
  "end": {
    "dateTime": "<string>",
    "timeZone": "<string>"
  },
  "importance": "<enum: 'low' | 'normal' | 'high'>",
  "isAllDay": "<boolean>",
  "isCancelled": "<boolean>",
  "isOrganizer": "<boolean>",
  "location": {
    "address?": {
      "city?": "<string>",
      "countryOrRegion?": "<string>",
      "postalCode?": "<string>",
      "state?": "<string>",
      "street?": "<string>"
    },
    "coordinates?": {
      "accuracy?": "<number>",
      "altitude?": "<number>",
      "altitudeAccuracy?": "<number>",
      "latitude?": "<number>",
      "longitude?": "<number>"
    },
    "displayName?": "<string>",
    "locationEmailAddress?": "<string>",
    "locationUri?": "<string>",
    "locationType?": "<enum: 'default' | 'conferenceRoom' | 'homeAddress' | 'businessAddress' | 'geoCoordinates' | 'streetAddress' | 'hotel' | 'restaurant' | 'localBusiness' | 'postalAddress'>",
    "uniqueId?": "<string>",
    "uniqueIdType?": "<string>"
  },
  "onlineMeeting": "<{\"conferenceId?\":\"<string>\",\"joinUrl?\":\"<string>\",\"phones\":[{\"number\":\"<string>\",\"type\":\"<enum: 'home' | 'business' | 'mobile' | 'other' | 'assistant' | 'homeFax' | 'businessFax' | 'otherFax' | 'pager' | 'radio'>\"}],\"quickDial?\":\"<string>\",\"tollFreeNumbers\":\"<string[]>\",\"tollNumber?\":\"<string>\"} | <null>>",
  "onlineMeetingProvider": "<string>",
  "organizer": {
    "emailAddress": {
      "address": "<string>",
      "name": "<string>"
    }
  },
  "recurrence": "<{\"pattern?\":{\"dayOfMonth?\":\"<number>\",\"daysOfWeek?\":\"<string[]>\",\"firstDayOfWeek?\":\"<string>\",\"index?\":\"<enum: 'first' | 'second' | 'third' | 'fourth' | 'last'>\",\"interval\":\"<number>\",\"month?\":\"<number>\",\"type\":\"<enum: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly'>\"},\"range\":{\"endDate?\":\"<string>\",\"numberOfOccurrences?\":\"<number>\",\"recurrenceTimeZone?\":\"<string>\",\"startDate\":\"<string>\",\"type\":\"<enum: 'endDate' | 'noEnd' | 'numbered'>\"}} | <null>>",
  "responseRequested": "<boolean>",
  "responseStatus": {
    "response": "<string>",
    "time": "<string>"
  },
  "sensitivity": "<enum: 'normal' | 'personal' | 'private' | 'confidential'>",
  "start": {
    "dateTime": "<string>",
    "timeZone": "<string>"
  },
  "subject": "<string>",
  "webLink": "<string>"
}
```

### Expected Metadata

```json
{
  "backfillPeriodMs": "<number>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/outlook/syncs/events.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/outlook/syncs/events.md)

<!-- END  GENERATED CONTENT -->
The sync expects the following metadata:
```json
{
  "backfillPeriodMs": 7776000000,// Optional: Initial backfill window (in ms), used only when there's no last sync
}
```
If no metadata is provided:
- The sync will default to fetching calendar events from the last 1 month.
