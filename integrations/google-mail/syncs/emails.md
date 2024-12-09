# Emails

## General Information

- **Description:** Fetches a list of emails from gmail. Goes back default to 1 year
but metadata can be set using the `backfillPeriodMs` property
to change the lookback. The property should be set in milliseconds.

- **Version:** 1.0.3
- **Group:** Others
- **Scopes:**: https://www.googleapis.com/auth/gmail.readonly
- **Endpoint Type:** Sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/google-mail/syncs/emails.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /emails
- **Method:** GET
