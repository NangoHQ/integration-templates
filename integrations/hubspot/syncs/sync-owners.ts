import { createSync } from 'nango';
import { z } from 'zod';

const OwnerSchema = z.object({
    id: z.string(),
    email: z.union([z.string(), z.null()]),
    first_name: z.union([z.string(), z.null()]),
    last_name: z.union([z.string(), z.null()]),
    user_id: z.union([z.number(), z.null()]),
    archived: z.boolean(),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    after: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync HubSpot owners with names, email, user IDs, and archive status',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/sync-owners', group: 'Owners' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Owner: OwnerSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        let after = checkpoint?.after || undefined;

        while (true) {
            const response = await nango.get<{
                results?: any[];
                paging?: { next?: { after?: string } };
            }>({
                // https://developers.hubspot.com/docs/api-reference/crm-crm-owners-v3/owners/get-crm-v3-owners-
                endpoint: '/crm/v3/owners',
                params: {
                    limit: '100',
                    ...(after && { after })
                },
                retries: 3
            });

            const records = (response.data.results ?? []).map((owner) => ({
                id: owner.id,
                email: owner.email ?? null,
                first_name: owner.firstName ?? null,
                last_name: owner.lastName ?? null,
                user_id: owner.userId ?? null,
                archived: owner.archived ?? false,
                created_at: owner.createdAt ?? null,
                updated_at: owner.updatedAt ?? null
            }));

            if (records.length === 0) {
                break;
            }

            await nango.batchSave(records, 'Owner');

            const nextAfter = response.data.paging?.next?.after;
            if (nextAfter) {
                after = nextAfter;
                await nango.saveCheckpoint({
                    after
                });
                continue;
            }

            break;
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
