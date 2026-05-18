import { createSync } from 'nango';
import { z } from 'zod';

const AttioListSchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        list_id: z.string()
    }),
    api_slug: z.string(),
    name: z.string(),
    parent_object: z.array(z.string()),
    workspace_access: z.string().nullable(),
    workspace_member_access: z.array(
        z.object({
            workspace_member_id: z.string(),
            level: z.string()
        })
    ),
    created_by_actor: z.object({
        id: z.string().nullable().optional(),
        type: z.string().nullable().optional()
    }),
    created_at: z.string()
});

const ListSchema = z.object({
    id: z.string(),
    api_slug: z.string(),
    name: z.string(),
    parent_object: z.array(z.string()),
    workspace_access: z.string().nullable().optional(),
    workspace_member_access: z.array(
        z.object({
            workspace_member_id: z.string(),
            level: z.string()
        })
    ),
    created_by_actor: z
        .object({
            id: z.string().optional(),
            type: z.string().optional()
        })
        .optional(),
    created_at: z.string()
});

const sync = createSync({
    description: 'Sync lists from Attio',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'POST', path: '/syncs/lists' }],
    models: {
        List: ListSchema
    },
    scopes: ['list_configuration:read'],

    exec: async (nango) => {
        // Blocker: GET /v2/lists has no query parameters, no pagination,
        // and list objects do not include an updated_at field.
        // There is no cursor, offset, or changed-records endpoint for lists.
        await nango.trackDeletesStart('List');

        // https://docs.attio.com/rest-api
        const response = await nango.get({
            endpoint: '/v2/lists',
            retries: 3
        });

        const parsed = z.object({ data: z.array(AttioListSchema) }).parse(response.data);

        const lists = parsed.data.map((list) => {
            const createdByActor =
                list.created_by_actor.id != null || list.created_by_actor.type != null
                    ? {
                          ...(list.created_by_actor.id != null && { id: list.created_by_actor.id }),
                          ...(list.created_by_actor.type != null && { type: list.created_by_actor.type })
                      }
                    : undefined;

            return {
                id: list.id.list_id,
                api_slug: list.api_slug,
                name: list.name,
                parent_object: list.parent_object,
                workspace_access: list.workspace_access ?? undefined,
                workspace_member_access: list.workspace_member_access,
                ...(createdByActor && { created_by_actor: createdByActor }),
                created_at: list.created_at
            };
        });

        if (lists.length > 0) {
            await nango.batchSave(lists, 'List');
        }

        await nango.trackDeletesEnd('List');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
