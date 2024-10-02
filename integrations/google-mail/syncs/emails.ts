import type { NangoSync, GmailEmail, OptionalBackfillSetting } from '../../models';

// 1 year ago
const DEFAULT_BACKFILL_MS = 365 * 24 * 60 * 60 * 1000;

export default async function fetchData(nango: NangoSync) {
    const metadata = await nango.getMetadata<OptionalBackfillSetting>();
    const backfillMilliseconds = metadata?.backfillPeriodMs || DEFAULT_BACKFILL_MS;
    const backfillPeriod = new Date(Date.now() - backfillMilliseconds);
    const { lastSyncDate } = nango;
    const syncDate = lastSyncDate || backfillPeriod;

    const pageSize = 100;
    let nextPageToken: string | undefined = '';

    do {
        const response: any = await nango.proxy({
            method: 'GET',
            endpoint: '/gmail/v1/users/me/messages',
            params: {
                maxResults: `${pageSize}`,
                q: `after:${Math.floor(syncDate.getTime() / 1000)}`,
                pageToken: nextPageToken
            },
            retries: 10
        });

        const messageList = response.data.messages || [];
        const emails: GmailEmail[] = [];

        for (const message of messageList) {
            const messageDetail = await nango.proxy({
                method: 'GET',
                endpoint: `/gmail/v1/users/me/messages/${message.id}`,
                retries: 10
            });

            const headers = messageDetail.data.payload.headers.reduce((acc: any, current: any) => {
                return {
                    ...acc,
                    [current.name]: current.value
                };
            }, {});

            emails.push(mapEmail(messageDetail, headers));
        }

        await nango.batchSave(emails, 'GmailEmail');

        nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);
}

function mapEmail(messageDetail: any, headers: any): GmailEmail {
    const parts = messageDetail.data.payload.parts || [];
    let body = '';
    for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
            // Body can be empty if the part is an attachment
            // https://developers.google.com/gmail/api/reference/rest/v1/users.messages.attachments#MessagePartBody
            body = Buffer.from(part.body.data, 'base64').toString('utf8');
            break;
        }
    }
    return {
        id: messageDetail.data.id,
        sender: headers.From,
        recipients: headers.To,
        date: new Date(parseInt(messageDetail.data.internalDate)),
        subject: headers.Subject,
        body: body,
        threadId: messageDetail.data.threadId
    };
}
