import { createSync } from 'nango';
import { z } from 'zod';

const OwnerSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    userId: z.number().optional(),
    archived: z.boolean(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

const OwnerApiSchema = z.object({
    id: z.string(),
    email: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    userId: z.number().nullish(),
    archived: z.boolean().optional(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});

function parseOptional<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
}

const sync = createSync({
    description: 'Sync HubSpot owners with names, email, user IDs, and archive status',
    version: '3.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/owners', group: 'Owners' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Owner: OwnerSchema
    },

    exec: async (nango) => {
        const checkpoint = parseOptional(CheckpointSchema, await nango.getCheckpoint());

        const proxyConfig = {
            // https://developers.hubspot.com/docs/api/crm/owners
            endpoint: '/crm/v3/owners',
            params: {
                limit: '100',
                ...(checkpoint?.['updatedAfter'] && { updatedAfter: checkpoint['updatedAfter'] })
            },
            paginate: { limit: 100 },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const owners = z.array(OwnerApiSchema).parse(batch);
            const records = owners.map((owner) => ({
                id: owner.id,
                email: owner.email ?? undefined,
                firstName: owner.firstName ?? undefined,
                lastName: owner.lastName ?? undefined,
                userId: owner.userId ?? undefined,
                archived: owner.archived ?? false,
                createdAt: owner.createdAt ?? undefined,
                updatedAt: owner.updatedAt ?? undefined
            }));

            if (records.length === 0) {
                continue;
            }

            await nango.batchSave(records, 'Owner');
            const lastRecord = records[records.length - 1];
            if (lastRecord?.updatedAt) {
                await nango.saveCheckpoint({
                    updatedAfter: lastRecord.updatedAt
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
