import { z } from 'zod';
import { createAction } from 'nango';

const ViewFieldSchema = z.enum([
    'id',
    'details',
    'tags',
    'customer',
    'last_message',
    'name',
    'email',
    'created',
    'updated',
    'assignee',
    'assignee_team',
    'channel',
    'closed',
    'language',
    'last_received_message',
    'integrations',
    'snooze',
    'status',
    'subject',
    'priority'
]);

const ViewDecorationInputSchema = z.object({
    emoji: z.string().optional().describe('Emoji displayed before the view name.')
});

const InputSchema = z
    .object({
        name: z.string().optional().describe('The display name of the view.'),
        slug: z.string().describe('URL-compatible identifier for the view. Required by the API.'),
        type: z.enum(['ticket-list', 'customer-list']).optional().describe('Type of objects the view filters. Defaults to ticket-list.'),
        filters: z.string().optional().describe("JavaScript expression used to filter items in the view. Example: eq(ticket.status, 'open')"),
        fields: z.array(ViewFieldSchema).optional().describe('List of attributes displayed in the view UI.'),
        visibility: z.enum(['public', 'shared', 'private']).optional().describe('Visibility level: public, shared, or private.'),
        order_by: z.string().optional().describe('Attribute used to sort items in the view. Example: updated_datetime.'),
        order_dir: z.enum(['asc', 'desc']).optional().describe('Sort direction: asc or desc.'),
        shared_with_users: z.array(z.number()).optional().describe('User IDs to share the view with. Required for private visibility (exactly one user).'),
        shared_with_teams: z.array(z.number()).optional().describe('Team IDs to share the view with.'),
        decoration: ViewDecorationInputSchema.optional().describe('Visual decoration such as an emoji.')
    })
    .describe('Input to create a Gorgias view.');

const ViewDecorationOutputSchema = z.object({
    emoji: z.string().optional().describe('Emoji displayed before the view name.')
});

const ViewSharedWithTeamSchema = z.object({
    id: z.number().describe('ID of the team.'),
    name: z.string().describe('Name of the team.'),
    decoration: z.object({}).optional().describe('Visual decoration for the team.')
});

const ViewSharedWithUserSchema = z.object({
    id: z.number().describe('ID of the user.'),
    name: z.string().describe('Name of the user.'),
    meta: z.object({}).optional().describe('Additional metadata about the user.')
});

const ProviderViewSchema = z.object({
    id: z.number(),
    category: z.string().nullable().optional(),
    created_datetime: z.string().nullable().optional(),
    deactivated_datetime: z.string().nullable().optional(),
    decoration: ViewDecorationOutputSchema.nullable().optional(),
    fields: z.array(ViewFieldSchema).nullable().optional(),
    filters: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    order_by: z.string().nullable().optional(),
    order_dir: z.string().nullable().optional(),
    search: z.string().nullable().optional(),
    shared_with_teams: z.array(ViewSharedWithTeamSchema).nullable().optional(),
    shared_with_users: z.array(ViewSharedWithUserSchema).nullable().optional(),
    slug: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    uri: z.string().nullable().optional(),
    visibility: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the created view.'),
        category: z.string().optional().describe('Internal category: user or system.'),
        created_datetime: z.string().optional().describe('ISO 8601 creation timestamp.'),
        deactivated_datetime: z.string().optional().describe('ISO 8601 deactivation timestamp.'),
        decoration: ViewDecorationOutputSchema.optional().describe('Visual decoration such as an emoji.'),
        fields: z.array(ViewFieldSchema).optional().describe('Fields displayed in the view.'),
        filters: z.string().optional().describe('Filter expression for the view.'),
        name: z.string().optional().describe('Display name of the view.'),
        order_by: z.string().optional().describe('Attribute used to sort view items.'),
        order_dir: z.string().optional().describe('Sort direction of the view.'),
        search: z.string().optional().describe('Search query text for the view.'),
        shared_with_teams: z.array(ViewSharedWithTeamSchema).optional().describe('Teams the view is shared with.'),
        shared_with_users: z.array(ViewSharedWithUserSchema).optional().describe('Users the view is shared with.'),
        slug: z.string().optional().describe('URL-compatible identifier of the view.'),
        type: z.string().optional().describe('Type of objects the view filters.'),
        uri: z.string().optional().describe('Auto-generated URI of the view.'),
        visibility: z.string().optional().describe('Visibility level of the view.')
    })
    .describe('The created Gorgias view.');

/**
 * @tags: [write]
 * @tagReason: Creates a new view on the provider.
 * @pitfalls: Private views require exactly one user in shared_with_users; otherwise the API returns 400.
 */
const action = createAction({
    description: 'Create a view (saved filter) for tickets or customers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            slug: input.slug
        };

        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.type !== undefined) {
            data['type'] = input.type;
        }
        if (input.filters !== undefined) {
            data['filters'] = input.filters;
        }
        if (input.fields !== undefined) {
            data['fields'] = input.fields;
        }
        if (input.visibility !== undefined) {
            data['visibility'] = input.visibility;
        }
        if (input.order_by !== undefined) {
            data['order_by'] = input.order_by;
        }
        if (input.order_dir !== undefined) {
            data['order_dir'] = input.order_dir;
        }
        if (input.shared_with_users !== undefined) {
            data['shared_with_users'] = input.shared_with_users;
        }
        if (input.shared_with_teams !== undefined) {
            data['shared_with_teams'] = input.shared_with_teams;
        }
        if (input.decoration !== undefined) {
            data['decoration'] = input.decoration;
        }

        const response = await nango.post({
            // https://developers.gorgias.com/reference/create-view
            endpoint: '/api/views',
            data,
            retries: 1
        });

        const view = ProviderViewSchema.parse(response.data);

        return {
            id: view.id,
            ...(view.category != null && { category: view.category }),
            ...(view.created_datetime != null && { created_datetime: view.created_datetime }),
            ...(view.deactivated_datetime != null && { deactivated_datetime: view.deactivated_datetime }),
            ...(view.decoration != null && { decoration: view.decoration }),
            ...(view.fields != null && { fields: view.fields }),
            ...(view.filters != null && { filters: view.filters }),
            ...(view.name != null && { name: view.name }),
            ...(view.order_by != null && { order_by: view.order_by }),
            ...(view.order_dir != null && { order_dir: view.order_dir }),
            ...(view.search != null && { search: view.search }),
            ...(view.shared_with_teams != null && { shared_with_teams: view.shared_with_teams }),
            ...(view.shared_with_users != null && { shared_with_users: view.shared_with_users }),
            ...(view.slug != null && { slug: view.slug }),
            ...(view.type != null && { type: view.type }),
            ...(view.uri != null && { uri: view.uri }),
            ...(view.visibility != null && { visibility: view.visibility })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
