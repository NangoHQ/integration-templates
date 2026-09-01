import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ViewSchema = z
    .object({
        id: z.string().describe('Unique identifier of the view.'),
        category: z.string().optional().describe('Category used to identify system and user views. System views cannot be deleted.'),
        created_datetime: z.string().describe('ISO 8601 timestamp when the view was created.'),
        deactivated_datetime: z.string().optional().describe('ISO 8601 timestamp when the view was deactivated, if applicable.'),
        decoration: z
            .object({
                emoji: z.string().optional().describe('Emoji displayed before the view name in the UI.')
            })
            .optional()
            .describe('Visual decoration object for the view.'),
        fields: z.array(z.string()).optional().describe('List of object attributes displayed in the UI for this view.'),
        filters: z.string().optional().describe('JavaScript logic used to filter the items displayed in the view.'),
        name: z.string().describe('Name of the view.'),
        order_by: z.string().optional().describe('Attribute name used to sort the items displayed in the view.'),
        order_dir: z.enum(['asc', 'desc']).optional().describe('Sort direction of the items displayed in the view.'),
        search: z.string().optional().describe('Search query text used to filter items in the view.'),
        shared_with_teams: z
            .array(
                z.object({
                    id: z.number().describe('ID of the team the view is shared with.'),
                    name: z.string().describe('Name of the team the view is shared with.'),
                    decoration: z
                        .object({
                            emoji: z.string().optional().describe('Emoji displayed before the team name in the UI.')
                        })
                        .optional()
                        .describe('Visual decoration object for the team.')
                })
            )
            .optional()
            .describe('Teams this view is shared with.'),
        shared_with_users: z
            .array(
                z.object({
                    id: z.number().describe('ID of the user the view is shared with.'),
                    name: z.string().describe('Name of the user the view is shared with.'),
                    meta: z.record(z.string(), z.unknown()).optional().describe('User-defined JSON object with additional info about the user.')
                })
            )
            .optional()
            .describe('Users this view is shared with.'),
        slug: z.string().optional().describe('Deprecated URL-compatible name of the view.'),
        type: z.enum(['ticket-list', 'customer-list']).optional().describe('Type of objects the view is applied on.'),
        uri: z.string().describe('Auto-generated URI of the view object.'),
        visibility: z.enum(['public', 'shared', 'private']).optional().describe('Visibility level of the view.')
    })
    .describe('A saved ticket or customer filter definition, including built-in system views and user-created views.');

const ProviderViewSchema = z.object({
    id: z.number(),
    category: z.string().optional(),
    created_datetime: z.string(),
    deactivated_datetime: z.string().optional().nullable(),
    decoration: z
        .object({
            emoji: z.string().optional()
        })
        .optional()
        .nullable(),
    fields: z.array(z.string()).optional(),
    filters: z.string().optional().nullable(),
    name: z.string().optional(),
    order_by: z.string().optional().nullable(),
    order_dir: z.enum(['asc', 'desc']).optional().nullable(),
    search: z.string().optional().nullable(),
    shared_with_teams: z
        .array(
            z
                .object({
                    id: z.number(),
                    name: z.string(),
                    decoration: z
                        .object({
                            emoji: z.string().optional()
                        })
                        .optional()
                        .nullable()
                })
                .optional()
                .nullable()
        )
        .optional()
        .nullable(),
    shared_with_users: z
        .array(
            z
                .object({
                    id: z.number(),
                    name: z.string(),
                    meta: z.record(z.string(), z.unknown()).optional().nullable()
                })
                .optional()
                .nullable()
        )
        .optional()
        .nullable(),
    slug: z.string().optional().nullable(),
    type: z.enum(['ticket-list', 'customer-list']).optional().nullable(),
    uri: z.string(),
    visibility: z.enum(['public', 'shared', 'private']).optional().nullable()
});

const sync = createSync({
    description: 'Sync views (saved ticket/customer filter definitions), including built-in system views.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        View: ViewSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes order_by for sorting; no modified_since or
        // changed-records endpoint exists. Full refresh is required.
        await nango.trackDeletesStart('View');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-views
            endpoint: '/api/views',
            params: {
                limit: 100,
                order_by: 'created_datetime:asc'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const rawViews = [];
            for (const item of batch) {
                const parsed = ProviderViewSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse view: ${JSON.stringify(parsed.error.issues)}`);
                }
                rawViews.push(parsed.data);
            }

            const views = rawViews.map((view) => {
                const mapped = {
                    id: view.id.toString(),
                    ...(view.category != null && { category: view.category }),
                    created_datetime: view.created_datetime,
                    ...(view.deactivated_datetime != null && { deactivated_datetime: view.deactivated_datetime }),
                    ...(view.decoration != null && {
                        decoration: {
                            ...(view.decoration.emoji != null && { emoji: view.decoration.emoji })
                        }
                    }),
                    ...(view.fields != null && { fields: view.fields.filter((f) => f != null) }),
                    ...(view.filters != null && { filters: view.filters }),
                    ...(view.name != null && { name: view.name }),
                    ...(view.order_by != null && { order_by: view.order_by }),
                    ...(view.order_dir != null && { order_dir: view.order_dir }),
                    ...(view.search != null && { search: view.search }),
                    ...(view.shared_with_teams != null && {
                        shared_with_teams: view.shared_with_teams
                            .filter((t) => t != null)
                            .map((team) => ({
                                id: team.id,
                                name: team.name,
                                ...(team.decoration != null && {
                                    decoration: {
                                        ...(team.decoration.emoji != null && { emoji: team.decoration.emoji })
                                    }
                                })
                            }))
                    }),
                    ...(view.shared_with_users != null && {
                        shared_with_users: view.shared_with_users
                            .filter((u) => u != null)
                            .map((user) => ({
                                id: user.id,
                                name: user.name,
                                ...(user.meta != null && { meta: user.meta })
                            }))
                    }),
                    ...(view.slug != null && { slug: view.slug }),
                    ...(view.type != null && { type: view.type }),
                    uri: view.uri,
                    ...(view.visibility != null && { visibility: view.visibility })
                };
                return mapped;
            });

            if (views.length > 0) {
                await nango.batchSave(views, 'View');
            }
        }

        await nango.trackDeletesEnd('View');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
