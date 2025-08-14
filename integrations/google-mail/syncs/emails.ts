import { createSync } from 'nango';
import type { Schema$Message, Schema$MessagePart } from '../types.js';

import type { Attachments } from '../models.js';
import { GmailEmail, OptionalBackfillSetting } from '../models.js';

// 1 year ago
const DEFAULT_BACKFILL_MS = 365 * 24 * 60 * 60 * 1000;

const sync = createSync({
    description:
        'Fetches a list of emails from gmail. Goes back default to 1 year\nbut metadata can be set using the `backfillPeriodMs` property\nto change the lookback. The property should be set in milliseconds.',
    version: '2.0.1',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/emails',
            group: 'Emails'
        }
    ],

    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],

    models: {
        GmailEmail: GmailEmail
    },

    metadata: OptionalBackfillSetting,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function processParts(parts: Schema$MessagePart[], bodyObj: { body: string }, attachments: Attachments[]): void {
    for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data && !bodyObj.body) {
            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-value-modification
            bodyObj.body = Buffer.from(part.body.data, 'base64').toString('utf8');
        } else if (part.mimeType === 'text/html' && part.body?.data && !bodyObj.body) {
            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-value-modification
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

    if (parts.length > 0) {
        processParts(parts, bodyObj, attachments);
    } else if (messageDetail.payload?.body?.data) {
        // Handle simple API-sent emails with direct body data
        bodyObj.body = Buffer.from(messageDetail.payload.body.data, 'base64').toString('utf8');
    } else if (messageDetail.snippet) {
        bodyObj.body = messageDetail.snippet;
    }

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
