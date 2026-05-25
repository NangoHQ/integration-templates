import { createSync } from 'nango';
import { z } from 'zod';

// https://developer.clickup.com/reference/getspaces
const ProviderSpaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable().optional(),
    private: z.boolean().nullable().optional(),
    avatar: z.string().nullable().optional(),
    admin_can_manage: z.boolean().nullable().optional(),
    archived: z.boolean().nullable().optional(),
    members: z
        .array(
            z.object({
                user: z.object({
                    id: z.number(),
                    username: z.string().optional(),
                    email: z.string().optional(),
                    color: z.string().optional(),
                    profilePicture: z.string().optional()
                }),
                can_edit: z.boolean().optional()
            })
        )
        .optional(),
    statuses: z
        .array(
            z.object({
                status: z.string(),
                color: z.string(),
                orderindex: z.number(),
                type: z.string()
            })
        )
        .optional(),
    multiple_assignees: z.boolean().optional(),
    features: z.record(z.string(), z.unknown()).optional()
});

const SpaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable().optional(),
    private: z.boolean().nullable().optional(),
    archived: z.boolean().nullable().optional(),
    adminCanManage: z.boolean().nullable().optional()
});

const MetadataSchema = z.object({
    team_id: z.string()
});

const sync = createSync({
    description: 'Sync spaces from ClickUp.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Space: SpaceSchema
    },
    endpoints: [
        {
            path: '/syncs/spaces',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: ClickUp spaces API has no updated_at filter, no pagination,
        // and no changed-since endpoint. Full refresh is required to detect deletions.
        const metadataResult = await nango.getMetadata();

        const metadata = z
            .object({
                team_id: z.string()
            })
            .safeParse(metadataResult);

        if (!metadata.success || !metadata.data.team_id) {
            throw new Error('Missing required metadata: team_id');
        }

        const teamId = metadata.data.team_id;

        await nango.trackDeletesStart('Space');

        // https://developer.clickup.com/reference/getspaces
        const response = await nango.get({
            endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/space`,
            params: {
                archived: 'false'
            },
            retries: 3
        });

        const rawData = response.data;

        const parsedResult = z
            .object({
                spaces: z.array(ProviderSpaceSchema)
            })
            .safeParse(rawData);

        if (!parsedResult.success) {
            await nango.log('Failed to parse spaces response', {
                level: 'error',
                error: parsedResult.error.message
            });
            throw new Error(`Invalid response from ClickUp spaces API: ${parsedResult.error.message}`);
        }

        const spaces = parsedResult.data.spaces;

        if (spaces.length === 0) {
            await nango.log('No spaces found', { level: 'info' });
        } else {
            const mappedSpaces = spaces.map((space) => ({
                id: space.id,
                name: space.name,
                ...(space.color !== undefined && { color: space.color }),
                ...(space.private !== undefined && { private: space.private }),
                ...(space.archived !== undefined && { archived: space.archived }),
                ...(space.admin_can_manage !== undefined && { adminCanManage: space.admin_can_manage })
            }));

            await nango.batchSave(mappedSpaces, 'Space');
        }

        await nango.trackDeletesEnd('Space');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
