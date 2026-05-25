import { createSync } from 'nango';
import { toSms } from '../mappers/to-sms.js';
import type { ClickSendSms } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Sms } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Fetches the history of SMS messages sent through ClickSend.',
    version: '2.0.0',
    frequency: 'every half hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/sms/history',
            group: 'SMS'
        }
    ],

    models: {
        Sms: Sms
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        const params: Record<string, any> = {};

        if (checkpointUpdatedAfter) {
            params['date_from'] = Math.floor(new Date(checkpointUpdatedAfter).getTime() / 1000);
        }

        const config: ProxyConfiguration = {
            // https://developers.clicksend.com/docs/messaging/sms/other/view-sms-history
            endpoint: '/v3/sms/history',
            method: 'GET',
            params,
            retries: 10,
            paginate: {
                type: 'link',
                response_path: 'data.data',
                link_path_in_response_body: 'data.next_page_url',
                limit: 100,
                limit_name_in_request: 'limit'
            }
        };

        for await (const clickSendSmsArray of nango.paginate<ClickSendSms>(config)) {
            if (!Array.isArray(clickSendSmsArray)) {
                throw new Error('Did not receive an expected array');
            }

            const smsArray: Sms[] = clickSendSmsArray.map(toSms);

            if (smsArray.length > 0) {
                await nango.batchSave(smsArray, 'Sms');
            }
        }
        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
