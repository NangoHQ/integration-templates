import { createSync } from 'nango';
import type { GoogleMailLabel } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { GmailLabel } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of labels from gmail.',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/labels',
            group: 'Labels'
        }
    ],

    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],

    models: {
        GmailLabel: GmailLabel
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/gmail/api/reference/rest/v1/users.labels/list
            endpoint: `/gmail/v1/users/me/labels`,
            method: 'get',
            retries: 10
        };

        const response = await nango.proxy(config);

        const labels: GmailLabel[] = response.data.labels.map((label: GoogleMailLabel) => {
            return {
                id: label.id,
                name: label.name,
                messageListVisibility: label.messageListVisibility,
                labelListVisibility: label.labelListVisibility,
                type: label.type,
                messagesTotal: label.messagesTotal,
                messagesUnread: label.messagesUnread,
                threadsTotal: label.threadsTotal,
                threadsUnread: label.threadsUnread,
                color: label.color ?? null
            };
        });

        await nango.batchSave(labels, 'GmailLabel');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
