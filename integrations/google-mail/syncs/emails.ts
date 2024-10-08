import type { NangoSync, GmailEmail, OptionalBackfillSetting, Attachments } from '../../models';
import type { Schema$Message, Schema$MessagePart } from '../types';

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
        // https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list
        const response: any = await nango.proxy({
            method: 'get',
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
            const messageDetail = await nango.proxy<Schema$Message>({
                method: 'get',
                endpoint: `/gmail/v1/users/me/messages/${message.id}`,
                retries: 10
            });

            const headers: Record<string, any> = messageDetail.data.payload?.headers?.reduce((acc: any, current: any) => {
                return {
                    ...acc,
                    [current.name]: current.value
                };
            }, {});

            emails.push(mapEmail(messageDetail.data, headers));
        }

        await nango.batchSave(emails, 'GmailEmail');

        nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);
}

function processParts(parts: Schema$MessagePart[], bodyObj: { body: string }, attachments: Attachments[]): void {
    for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data && !bodyObj.body) {
            bodyObj.body = Buffer.from(part.body.data, 'base64').toString('utf8');
        } else if (part.mimeType === 'text/html' && part.body?.data && !bodyObj.body) {
            bodyObj.body = Buffer.from(part.body.data, 'base64').toString('utf8');
        } else if (part.filename && part.body?.attachmentId) {
            if (part.mimeType && part.body?.size !== undefined && part.body?.size !== null) {
                attachments.push({
                    filename: part.filename,
                    mimeType: part.mimeType,
                    size: part.body.size,
                    attachmentId: part.body.attachmentId
                });
            }
        }
        if (part.parts?.length) {
            processParts(part.parts, bodyObj, attachments);
        }
    }
}

function mapEmail(messageDetail: Schema$Message, headers: Record<string, any>): GmailEmail {
    const parts = messageDetail.payload?.parts || [];
    const bodyObj = { body: '' };
    const attachments: Attachments[] = [];

    processParts(parts, bodyObj, attachments);

    return {
        id: messageDetail.id,
        sender: headers['From'],
        recipients: headers['To'],
        date: new Date(parseInt(messageDetail.internalDate)).toISOString(),
        subject: headers['Subject'],
        body: bodyObj.body,
        attachments,
        threadId: messageDetail.threadId
    };
}
