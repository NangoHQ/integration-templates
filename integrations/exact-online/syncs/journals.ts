import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const JournalSchema = z.object({
    id: z.string(),
    code: z.string(),
    description: z.string().optional(),
    modified: z.string().optional()
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const JournalItemSchema = z.object({
    Code: z.string(),
    Description: z.string().nullish(),
    Modified: z.string().nullish()
});

const sync = createSync({
    description: 'Sync financial journals as full snapshot',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/journals'
        }
    ],
    models: {
        Journal: JournalSchema
    },

    exec: async (nango) => {
        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-reference-current-me
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.safeParse(meResponse.data);
        if (!meData.success) {
            throw new Error('Failed to parse /api/v1/current/Me response');
        }

        const firstResult = meData.data.d.results[0];
        if (!firstResult) {
            throw new Error('No results in /api/v1/current/Me response');
        }

        const division = firstResult.CurrentDivision;
        if (typeof division !== 'number') {
            throw new Error('Could not determine current division from /api/v1/current/Me');
        }

        await nango.trackDeletesStart('Journal');

        const proxyConfig: ProxyConfiguration = {
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-reference-financial-journals
            endpoint: `/api/v1/${encodeURIComponent(String(division))}/financial/Journals`,
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_calculation_method: 'by-response-size',
                response_path: 'd.results',
                limit_name_in_request: '$top',
                limit: 100
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const rawItems = z.array(JournalItemSchema).safeParse(pageResults);
            if (!rawItems.success) {
                throw new Error('Failed to parse journals response items');
            }

            const journals = rawItems.data.map((record) => ({
                id: record.Code,
                code: record.Code,
                ...(record.Description != null && { description: record.Description }),
                ...(record.Modified != null && { modified: record.Modified })
            }));

            if (journals.length > 0) {
                await nango.batchSave(journals, 'Journal');
            }
        }

        await nango.trackDeletesEnd('Journal');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
