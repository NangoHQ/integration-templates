import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RecruiterSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string()
});

const ResponseSchema = z.union([z.array(RecruiterSchema), z.object({ recruiters: z.array(RecruiterSchema) })]);

const sync = createSync({
    description: 'Sync external recruiters on the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Recruiter: RecruiterSchema
    },

    exec: async (nango) => {
        // Blocker: GET /spi/v3/recruiters has no changed-since filter,
        // no pagination, and no deleted-record endpoint.
        const config: ProxyConfiguration = {
            // https://workable.readme.io/reference/recruiters
            endpoint: '/spi/v3/recruiters',
            retries: 3
        };

        const response = await nango.get(config);

        const parsedResponse = ResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new Error(`Failed to parse recruiters response: ${parsedResponse.error.message}`);
        }

        const recruiters = Array.isArray(parsedResponse.data) ? parsedResponse.data : parsedResponse.data.recruiters;

        const records = recruiters.map((recruiter) => ({
            id: recruiter.id,
            name: recruiter.name,
            email: recruiter.email
        }));

        // Only start delete-tracking once the request has succeeded and the response has been
        // validated, so a failed/invalid fetch never leaves deletion-tracking permanently "open".
        await nango.trackDeletesStart('Recruiter');

        if (records.length > 0) {
            await nango.batchSave(records, 'Recruiter');
        }

        await nango.trackDeletesEnd('Recruiter');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
