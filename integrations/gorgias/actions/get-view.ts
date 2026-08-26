import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the view to retrieve.')
    })
    .describe('Input for retrieving a single view by its ID.');

const ProviderViewDecorationSchema = z.object({
    emoji: z.string().optional().describe("Emoji displayed before the view's name.")
});

const ProviderViewSharedWithTeamSchema = z.object({
    id: z.number().describe('ID of the team.'),
    name: z.string().describe('Name of the team.'),
    decoration: z
        .object({
            emoji: z.string().optional().describe("Emoji displayed before the team's name.")
        })
        .optional()
        .describe('Object describing how the team appears on the webpage.')
});

const ProviderViewSharedWithUserSchema = z.object({
    id: z.number().describe('ID of the user.'),
    name: z.string().describe('Name of the user.'),
    meta: z.record(z.string(), z.unknown()).optional().describe('User defined JSON field with additional info about the user.')
});

const ProviderViewSchema = z.object({
    id: z.number(),
    uri: z.string(),
    category: z.string().nullable().optional(),
    created_datetime: z.string().nullable().optional(),
    deactivated_datetime: z.string().nullable().optional(),
    decoration: ProviderViewDecorationSchema.nullable().optional(),
    fields: z.array(z.string()).nullable().optional(),
    filters: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    order_by: z.string().nullable().optional(),
    order_dir: z.enum(['asc', 'desc']).nullable().optional(),
    search: z.string().nullable().optional(),
    shared_with_teams: z.array(ProviderViewSharedWithTeamSchema).nullable().optional(),
    shared_with_users: z.array(ProviderViewSharedWithUserSchema).nullable().optional(),
    slug: z.string().nullable().optional(),
    type: z.enum(['ticket-list', 'customer-list']).nullable().optional(),
    visibility: z.enum(['public', 'shared', 'private']).nullable().optional()
});

const ViewDecorationSchema = z
    .object({
        emoji: z.string().optional().describe("Emoji displayed before the view's name.")
    })
    .describe('Object describing how the view appears in the applications.');

const ViewSharedWithTeamSchema = z
    .object({
        id: z.number().describe('ID of the team.'),
        name: z.string().describe('Name of the team.'),
        decoration: z
            .object({
                emoji: z.string().optional().describe("Emoji displayed before the team's name.")
            })
            .optional()
            .describe('Object describing how the team appears on the webpage.')
    })
    .describe('Team the view is shared with.');

const ViewSharedWithUserSchema = z
    .object({
        id: z.number().describe('ID of the user.'),
        name: z.string().describe('Name of the user.'),
        meta: z.record(z.string(), z.unknown()).optional().describe('User defined JSON field with additional info about the user.')
    })
    .describe('User the view is shared with.');

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the view.'),
        uri: z.string().describe('URI of the object (auto-generated).'),
        category: z.string().optional().describe('Category used to identify system and user views.'),
        created_datetime: z.string().optional().describe('When the view was created.'),
        deactivated_datetime: z.string().optional().describe('When the view was deactivated.'),
        decoration: ViewDecorationSchema.optional(),
        fields: z.array(z.string()).optional().describe('List of object attributes to be displayed in the UI.'),
        filters: z.string().optional().describe('The logic used to filter the items to be displayed in the view.'),
        name: z.string().optional().describe('The name of the view.'),
        order_by: z.string().optional().describe('Name of the object attribute used to sort the items of the view.'),
        order_dir: z.enum(['asc', 'desc']).optional().describe('Sort direction of the items displayed in the view.'),
        search: z.string().optional().describe('Text used to search for items matching the query.'),
        shared_with_teams: z.array(ViewSharedWithTeamSchema).optional().describe('Teams this view is shared with.'),
        shared_with_users: z.array(ViewSharedWithUserSchema).optional().describe('Users this view is shared with.'),
        slug: z.string().optional().describe('URL-compatible name of the view.'),
        type: z.enum(['ticket-list', 'customer-list']).optional().describe('Type of objects the view is applied on.'),
        visibility: z.enum(['public', 'shared', 'private']).optional().describe('Visibility of the view.')
    })
    .describe('A view allows you to filter and sort the tickets of your account according to one or more criteria.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single view by ID from the Gorgias API.
 */
const action = createAction({
    description: 'Retrieve a single view.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/get-view
            endpoint: `/api/views/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerView = ProviderViewSchema.parse(response.data);

        return {
            id: providerView.id,
            uri: providerView.uri,
            ...(providerView.category != null && { category: providerView.category }),
            ...(providerView.created_datetime != null && { created_datetime: providerView.created_datetime }),
            ...(providerView.deactivated_datetime != null && { deactivated_datetime: providerView.deactivated_datetime }),
            ...(providerView.decoration != null && { decoration: providerView.decoration }),
            ...(providerView.fields != null && { fields: providerView.fields }),
            ...(providerView.filters != null && { filters: providerView.filters }),
            ...(providerView.name != null && { name: providerView.name }),
            ...(providerView.order_by != null && { order_by: providerView.order_by }),
            ...(providerView.order_dir != null && { order_dir: providerView.order_dir }),
            ...(providerView.search != null && { search: providerView.search }),
            ...(providerView.shared_with_teams != null && { shared_with_teams: providerView.shared_with_teams }),
            ...(providerView.shared_with_users != null && { shared_with_users: providerView.shared_with_users }),
            ...(providerView.slug != null && { slug: providerView.slug }),
            ...(providerView.type != null && { type: providerView.type }),
            ...(providerView.visibility != null && { visibility: providerView.visibility })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
