import { z } from 'zod';
import { createAction } from 'nango';

const ViewDecorationSchema = z.object({
    emoji: z.string().optional().describe('Emoji displayed before the view name.')
});

const ViewSharedWithTeamSchema = z.object({
    id: z.number().describe('ID of the team.'),
    name: z.string().describe('Name of the team.'),
    decoration: ViewDecorationSchema.optional().describe('Appearance decoration for the team.')
});

const ViewSharedWithUserSchema = z.object({
    id: z.number().describe('ID of the user.'),
    name: z.string().describe('Name of the user.'),
    meta: z.object({}).passthrough().optional().describe('Additional metadata about the user.')
});

const ViewSchema = z.object({
    id: z.number().describe('ID of the view.'),
    uri: z.string().describe('URI of the view object.'),
    name: z.string().optional().describe('Name of the view.'),
    category: z.string().optional().describe('Category of the view, such as system or user.'),
    created_datetime: z.string().optional().describe('When the view was created.'),
    deactivated_datetime: z.string().optional().describe('When the view was deactivated.'),
    decoration: ViewDecorationSchema.optional().describe('Visual decoration for the view.'),
    fields: z.array(z.string()).optional().describe('List of fields displayed in the view UI.'),
    filters: z.string().optional().describe('Filter logic for the view as JavaScript code.'),
    order_by: z.string().optional().describe('Attribute used to sort items in the view.'),
    order_dir: z.string().optional().describe('Sort direction, either asc or desc.'),
    search: z.string().optional().describe('Search query text for the view.'),
    shared_with_teams: z.array(ViewSharedWithTeamSchema).optional().describe('Teams the view is shared with.'),
    shared_with_users: z.array(ViewSharedWithUserSchema).optional().describe('Users the view is shared with.'),
    slug: z.string().optional().describe('URL-compatible name of the view.'),
    type: z.string().optional().describe('Type of objects the view applies to, such as ticket-list or customer-list.'),
    visibility: z.string().optional().describe('Visibility level of the view.')
});

const InputSchema = z
    .object({
        order_by: z.string().optional().describe('Attribute used to order views. Example: created_datetime:asc or created_datetime:desc.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().optional().describe('Maximum number of views to return. Default is 30, maximum is 100.'),
        category: z.string().optional().describe('Filter views by category. Use system for system views or user for user-created views.')
    })
    .describe('Input parameters for listing views.');

const OutputSchema = z
    .object({
        views: z.array(ViewSchema).describe('Array of views matching the filter criteria.'),
        next_cursor: z.string().optional().describe('Cursor for the next page of results. Absent when there are no more pages.')
    })
    .describe('Output containing a list of views and an optional pagination cursor.');

const ProviderDecorationSchema = z.object({
    emoji: z.string().nullish()
});

const ProviderSharedWithTeamSchema = z.object({
    id: z.number(),
    name: z.string(),
    decoration: ProviderDecorationSchema.nullish()
});

const ProviderSharedWithUserSchema = z.object({
    id: z.number(),
    name: z.string(),
    meta: z.object({}).passthrough().nullish()
});

const ProviderViewSchema = z.object({
    id: z.number(),
    uri: z.string(),
    name: z.string().nullish(),
    category: z.string().nullish(),
    created_datetime: z.string().nullish(),
    deactivated_datetime: z.string().nullish(),
    decoration: ProviderDecorationSchema.nullish(),
    fields: z.array(z.string()).nullish(),
    filters: z.string().nullish(),
    order_by: z.string().nullish(),
    order_dir: z.string().nullish(),
    search: z.string().nullish(),
    shared_with_teams: z.array(ProviderSharedWithTeamSchema).nullish(),
    shared_with_users: z.array(ProviderSharedWithUserSchema).nullish(),
    slug: z.string().nullish(),
    type: z.string().nullish(),
    visibility: z.string().nullish()
});

const ProviderPaginationMetaSchema = z.object({
    prev_cursor: z.string().nullable(),
    next_cursor: z.string().nullable(),
    total_resources: z.number().nullable()
});

const ProviderResponseSchema = z.object({
    object: z.string().nullish(),
    uri: z.string().nullish(),
    data: z.array(z.unknown()),
    meta: ProviderPaginationMetaSchema
});

function mapProviderView(raw: z.infer<typeof ProviderViewSchema>): z.infer<typeof ViewSchema> {
    return {
        id: raw.id,
        uri: raw.uri,
        ...(raw.name != null && { name: raw.name }),
        ...(raw.category != null && { category: raw.category }),
        ...(raw.created_datetime != null && { created_datetime: raw.created_datetime }),
        ...(raw.deactivated_datetime != null && { deactivated_datetime: raw.deactivated_datetime }),
        ...(raw.decoration != null && {
            decoration: {
                ...(raw.decoration.emoji != null && { emoji: raw.decoration.emoji })
            }
        }),
        ...(raw.fields != null && { fields: raw.fields }),
        ...(raw.filters != null && { filters: raw.filters }),
        ...(raw.order_by != null && { order_by: raw.order_by }),
        ...(raw.order_dir != null && { order_dir: raw.order_dir }),
        ...(raw.search != null && { search: raw.search }),
        ...(raw.shared_with_teams != null && {
            shared_with_teams: raw.shared_with_teams.map((team) => ({
                id: team.id,
                name: team.name,
                ...(team.decoration != null && {
                    decoration: {
                        ...(team.decoration.emoji != null && { emoji: team.decoration.emoji })
                    }
                })
            }))
        }),
        ...(raw.shared_with_users != null && {
            shared_with_users: raw.shared_with_users.map((user) => ({
                id: user.id,
                name: user.name,
                ...(user.meta != null && { meta: user.meta })
            }))
        }),
        ...(raw.slug != null && { slug: raw.slug }),
        ...(raw.type != null && { type: raw.type }),
        ...(raw.visibility != null && { visibility: raw.visibility })
    };
}

/**
 * @tags: [read]
 * @tagReason: Reads view definitions from the Gorgias API.
 * @pitfalls: The returned `filters` strings contain literal `{{current_user.id}}` template variables that are not resolved to actual values, and the list includes both ticket-list and customer-list views with no input option to filter by type.
 */
const action = createAction({
    description: 'List views (saved ticket/customer filter definitions), optionally filtered to system or user-created views.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.gorgias.com/reference/list-views
        const response = await nango.get({
            endpoint: '/api/views',
            params: {
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.category !== undefined && { category: input.category })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const views = providerResponse.data.map((item) => {
            const parsed = ProviderViewSchema.parse(item);
            return mapProviderView(parsed);
        });

        return {
            views,
            ...(providerResponse.meta.next_cursor !== null && { next_cursor: providerResponse.meta.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
