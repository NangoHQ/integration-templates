import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PersonSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    full_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    position: z.string().optional(),
    company_id: z.number().optional(),
    user_id: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderPersonSchema = z.object({
    id: z.number(),
    type: z.string().nullable().optional(),
    full_name: z.string().nullable().optional(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    mobile: z.string().nullable().optional(),
    position: z.string().nullable().optional(),
    company_id: z.number().nullable().optional(),
    user_id: z.number().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Sync people (contacts/leads) in this account.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Person: PersonSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.nullable().safeParse(checkpoint ?? null);
        if (!parsedCheckpoint.success) {
            throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
        }

        const checkpointData = parsedCheckpoint.data;
        const isFirstRun = checkpointData === null;
        const syncStartTime = new Date()
            .toISOString()
            .replace('T', ' ')
            .replace(/\.\d+Z$/, '');

        if (isFirstRun) {
            await nango.trackDeletesStart('Person');
        }

        const params: Record<string, string> = {};
        if (checkpointData) {
            params['conditions%5Bperson_modified%5D%5Bfrom_date%5D'] = checkpointData['updated_after'];
        }

        const proxyConfig: ProxyConfiguration = {
            // https://app.pipelinecrm.com/openapi.yaml
            endpoint: '/api/v3/people',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'entries'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const rawRecords = z.array(z.unknown()).parse(batch);
            const people = [];

            for (const raw of rawRecords) {
                const parsed = ProviderPersonSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse person: ${parsed.error.message}`);
                }

                const record = parsed.data;
                people.push({
                    id: String(record.id),
                    ...(record.type != null && { type: record.type }),
                    ...(record.full_name != null && { full_name: record.full_name }),
                    ...(record.first_name != null && { first_name: record.first_name }),
                    ...(record.last_name != null && { last_name: record.last_name }),
                    ...(record.email != null && { email: record.email }),
                    ...(record.phone != null && { phone: record.phone }),
                    ...(record.mobile != null && { mobile: record.mobile }),
                    ...(record.position != null && { position: record.position }),
                    ...(record.company_id != null && { company_id: record.company_id }),
                    ...(record.user_id != null && { user_id: record.user_id }),
                    ...(record.created_at != null && { created_at: record.created_at }),
                    ...(record.updated_at != null && { updated_at: record.updated_at })
                });
            }

            if (people.length > 0) {
                await nango.batchSave(people, 'Person');
            }
        }

        if (isFirstRun) {
            await nango.trackDeletesEnd('Person');
        }

        await nango.saveCheckpoint({ updated_after: syncStartTime });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
