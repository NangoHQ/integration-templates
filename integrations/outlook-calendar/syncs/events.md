<!-- BEGIN GENERATED CONTENT -->
# Events

## General Information

- **Description:** Sync calendar events on the primary calendar going back one month and
save the entire object as specified by the Outlook Calendar API

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `Calendars.Read`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/outlook-calendar/syncs/events.ts)


## Endpoint Reference

### Request Endpoint

`GET /outlook-calendar/events`

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
  "allowNewTimeProposals?": "<boolean>",
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
        "response": "<none | accepted | declined | tentative>",
        "sentDateTime": "<string>"
      },
      "type": "<required | optional | resource>"
    }
  ],
  "body": {
    "content": "<string>",
    "contentType": "<text | html>"
  },
  "bodyPreview": "<string>",
  "categories": [
    "<string>"
  ],
  "changeKey": "<string>",
  "createdDateTime": "<string>",
  "end": {
    "dateTime": "<string>",
    "timeZone": "<string>"
  },
  "hasAttachments": "<boolean>",
  "hideAttendees": "<boolean>",
  "iCalUId": "<string>",
  "importance": "<low | normal | high>",
  "isAllDay": "<boolean>",
  "isCancelled": "<boolean>",
  "isDraft": "<boolean>",
  "isOnlineMeeting?": "<boolean>",
  "isOrganizer": "<boolean>",
  "isReminderOn": "<boolean>",
  "lastModifiedDateTime": "<string>",
  "location": {
    "address": "<string>",
    "city": "<string>",
    "countryOrRegion": "<string>",
    "postalCode": "<string>",
    "state": "<string>",
    "street": "<string>",
    "coordinates": [],
    "accuracy": "<number>",
    "altitude": "<number>",
    "altitudeAccuracy": "<number>",
    "latitude": "<number>",
    "longitude": "<number>",
    "displayName": "<string>",
    "locationEmailAddress": "<string>",
    "locationUri": "<string>",
    "locationType": "<default | conferenceRoom | homeAddress | businessAddress | geoCoordinates | streetAddress | hotel | restaurant | localBusiness | postalAddress>",
    "uniqueId": "<string>",
    "uniqueIdType": "<string>"
  },
  "locations": [
    {
      "address": "<string>",
      "city": "<string>",
      "countryOrRegion": "<string>",
      "postalCode": "<string>",
      "state": "<string>",
      "street": "<string>",
      "coordinates": [],
      "accuracy": "<number>",
      "altitude": "<number>",
      "altitudeAccuracy": "<number>",
      "latitude": "<number>",
      "longitude": "<number>",
      "displayName": "<string>",
      "locationEmailAddress": "<string>",
      "locationUri": "<string>",
      "locationType": "<default | conferenceRoom | homeAddress | businessAddress | geoCoordinates | streetAddress | hotel | restaurant | localBusiness | postalAddress>",
      "uniqueId": "<string>",
      "uniqueIdType": "<string>"
    }
  ],
  "onlineMeeting": "<OnlineMeetingInfo | null>",
  "onlineMeetingProvider?": "<string>",
  "onlineMeetingUrl?": "<string>",
  "organizer": {
    "emailAddress": {
      "address": "<string>",
      "name": "<string>"
    }
  },
  "originalEndTimeZone": "<string>",
  "originalStart": "<string>",
  "originalStartTimeZone": "<string>",
  "recurrence": {
    "pattern": {
      "dayOfMonth?": "<number>",
      "daysOfWeek?": {
        "0": "<sunday>",
        "1": "<monday>",
        "2": "<tuesday>",
        "3": "<wednesday>",
        "4": "<thursday>",
        "5": "<friday>",
        "6": "<saturday>"
      },
      "firstDayOfWeek": "<sunday | monday | tuesday | wednesday | thursday | friday | saturday>",
      "index?": "<first | second | third | fourth | last>",
      "interval": "<number>",
      "month?": "<number>",
      "type": "<daily | weekly | absoluteMonthly | relativeMonthly | absoluteYearly | relativeYearly>"
    },
    "range": {
      "endDate?": "<string>",
      "numberOfOccurrences?": "<number>",
      "recurrenceTimeZone?": "<string>",
      "startDate": "<string>",
      "type": "<endDate | noEnd | numbered>"
    }
  },
  "reminderMinutesBeforeStart": "<number>",
  "responseRequested": "<boolean>",
  "responseStatus": {
    "response": "<none | accepted | declined | tentative>",
    "sentDateTime": "<string>"
  },
  "sensitivity": "<normal | personal | private | confidential>",
  "seriesMasterId": "<string>",
  "showAs": "<free | tentative | busy | oof | workingElsewhere | unknown>",
  "start": {
    "dateTime": "<string>",
    "timeZone": "<string>"
  },
  "subject": "<string>",
  "transactionId?": "<string>",
  "type": "<singleInstance | occurrence | exception | seriesMaster>",
  "webLink": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/outlook-calendar/syncs/events.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/outlook-calendar/syncs/events.md)

<!-- END  GENERATED CONTENT -->

