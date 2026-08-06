import { createSync } from 'nango';
import { z } from 'zod';

const ProviderGroupSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    owner: z.string(),
    description: z.string().nullable(),
    hidden: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
});

const ProviderGroupsResponseSchema = z.object({
    count: z.number(),
    items: z.array(ProviderGroupSchema)
});

const GroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    owner: z.string(),
    description: z.string().optional(),
    hidden: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string()
});

const sync = createSync({
    description: 'Sync user groups in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    models: {
        Group: GroupSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const metadataSchema = z.object({
            accountUuid: z.string()
        });
        const parsedMetadata = metadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('Missing accountUuid in connection metadata');
        }
        const accountUuid = parsedMetadata.data.accountUuid;

        await nango.trackDeletesStart('Group');

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/groups-api
        const response = await nango.get({
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/groups`,
            retries: 3
        });

        const parsed = ProviderGroupsResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse groups response: ${parsed.error.message}`);
        }

        const groups = parsed.data.items.map((group) => ({
            id: group.uuid,
            name: group.name,
            owner: group.owner,
            ...(group.description !== null && { description: group.description }),
            hidden: group.hidden,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt
        }));

        if (groups.length > 0) {
            await nango.batchSave(groups, 'Group');
        }

        await nango.trackDeletesEnd('Group');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
