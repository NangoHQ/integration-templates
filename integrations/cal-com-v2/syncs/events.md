# Events

## General Information

- **Description:** Retrieve all upcoming events per a user
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/cal-com-v2/syncs/events.ts)


## Endpoint Reference

### Request Endpoint

`GET /events`

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
  "id": "<string>",
  "title": "<string>",
  "userPrimaryEmail": "<string>",
  "description": "<string>",
  "customInputs": {
    "__string": "<any>"
  },
  "startTime": "<string>",
  "endTime": "<string>",
  "attendees": [
    {
      "id": "<number>",
      "email": "<string>",
      "name": "<string>",
      "timeZone": "<string>",
      "locale": "<string>",
      "bookingId": "<number>"
    }
  ],
  "metadata": {
    "__string": "<any>"
  },
  "uid": "<string>",
  "recurringEventId": "<string>",
  "location": "<string>",
  "eventType": {
    "slug": "<string>",
    "id": "<number>",
    "eventName": "<string>",
    "price": "<number>",
    "recurringEvent": {
      "__string": "<any>"
    },
    "currency": "<string>",
    "metadata": {
      "__string": "<any>"
    },
    "seatsShowAttendees": {
      "__string": "<any>"
    },
    "seatsShowAvailabilityCount": {
      "__string": "<any>"
    },
    "team": {
      "__string": "<any>"
    }
  },
  "status": {
    "__string": "<any>"
  },
  "paid": "<boolean>",
  "payment": {
    "0": {
      "__string": "<any>"
    }
  },
  "references": {
    "0": {
      "id": "<number>",
      "type": "<string>",
      "uid": "<string>",
      "meetingId": "<string>",
      "thirdPartyRecurringEventId": "<string>",
      "meetingPassword": "<string>",
      "meetingUrl": "<string>",
      "bookingId": "<number>",
      "externalCalendarId": "<string>",
      "deleted": {
        "__string": "<string>"
      },
      "credentialId": "<number>"
    }
  },
  "isRecorded": "<boolean>",
  "seatsReferences": {
    "0": {
      "__string": "<any>"
    }
  },
  "user": {
    "username": "<string>",
    "name": "<string>",
    "weekStart": "<string>",
    "organizationId": "<number>",
    "avatarUrl": "<string>",
    "profile": {
      "username": "<string>",
      "id": "<number>",
      "userId": "<number>",
      "uid": "<string>",
      "name": "<string>",
      "organizationId": "<number>",
      "organization": {
        "id": "<number>",
        "slug": "<string>",
        "name": "<string>",
        "metadata": {
          "__string": "<any>"
        }
      },
      "upId": "<string>",
      "image": "<string>",
      "brandColor": "<string>",
      "darkBrandColor": "<string>",
      "theme": "<string>",
      "bookerLayouts": {
        "__string": "<any>"
      }
    },
    "bookerUrl": "<string>"
  },
  "rescheduled": {
    "__string": "<any>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/cal-com-v2/syncs/events.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/cal-com-v2/syncs/events.md)

<!-- END  GENERATED CONTENT -->

