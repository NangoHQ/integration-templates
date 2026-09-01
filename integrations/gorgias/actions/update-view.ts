import { z } from 'zod';
import { createAction } from 'nango';

const ViewDecorationSchema = z.object({
    emoji: z.string().optional().describe("Emoji displayed before the view's name.")
});

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

const ViewTypeSchema = z.enum(['ticket-list', 'customer-list']);

const ViewVisibilitySchema = z.enum(['public', 'shared', 'private']);

const ViewSharedWithTeamSchema = z.object({
    id: z.number().describe('ID of the team.'),
    name: z.string().describe('Name of the team.'),
    decoration: z.object({}).optional().describe('Object describing how the team appears on the webpage.')
});

const ViewSharedWithUserSchema = z.object({
    id: z.number().describe('ID of the user.'),
    name: z.string().describe('Name of the user.'),
    meta: z.object({}).optional().describe('User defined JSON field with additional info about the user.')
});

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the view to update.'),
        name: z.string().optional().describe('The name of the view.'),
        filters: z.string().optional().describe('The logic used to filter the items to be displayed in the view (as JavaScript code).'),
        fields: z.array(ViewFieldSchema).optional().describe("List of object's attributes to be displayed in the UI."),
        order_by: z.string().optional().describe("Name of the object's attribute used to sort the items of the view."),
        order_dir: z.enum(['asc', 'desc']).optional().describe('Sort direction of the items displayed in the view.'),
        slug: z.string().optional().describe('DEPRECATED - URL-compatible name of the view.'),
        type: ViewTypeSchema.optional().describe('Type of objects the view is applied on.'),
        visibility: ViewVisibilitySchema.optional().describe('Visibility of the view. Possible values: public, shared, private.'),
        shared_with_users: z.array(z.number()).optional().describe('IDs of users this view is shared with.'),
        shared_with_teams: z.array(z.number()).optional().describe('IDs of teams this view is shared with.'),
        decoration: ViewDecorationSchema.optional().describe('Object describing how the view appears in applications.')
    })
    .describe('Fields to update on an existing view.');

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the view.'),
        category: z.string().nullable().optional().describe('Category used to identify system and user views.'),
        created_datetime: z.string().nullable().optional().describe('When the view was created.'),
        deactivated_datetime: z.string().nullable().optional().describe('When the view was deactivated.'),
        decoration: ViewDecorationSchema.nullable().optional().describe('Object describing how the view appears in applications.'),
        fields: z.array(ViewFieldSchema).nullable().optional().describe("List of object's attributes displayed in the UI."),
        filters: z.string().nullable().optional().describe('The logic used to filter items in the view.'),
        name: z.string().nullable().optional().describe('The name of the view.'),
        order_by: z.string().nullable().optional().describe('Attribute used to sort items in the view.'),
        order_dir: z.enum(['asc', 'desc']).nullable().optional().describe('Sort direction of items in the view.'),
        search: z.string().nullable().optional().describe('Text used to search for items matching the query.'),
        shared_with_teams: z.array(ViewSharedWithTeamSchema).nullable().optional().describe('Teams this view is shared with.'),
        shared_with_users: z.array(ViewSharedWithUserSchema).nullable().optional().describe('Users this view is shared with.'),
        slug: z.string().nullable().optional().describe('DEPRECATED - URL-compatible name of the view.'),
        type: ViewTypeSchema.nullable().optional().describe('Type of objects the view is applied on.'),
        uri: z.string().nullable().optional().describe('URI of the object (auto-generated).'),
        visibility: ViewVisibilitySchema.nullable().optional().describe('Visibility of the view.')
    })
    .describe('The updated view.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing view's fields via a PUT request to the provider.
 * @pitfalls: The `filters` field is JavaScript code parsed by the provider and the `decoration` object only supports an `emoji` field.
 */
const action = createAction({
    description: "Update a view's fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tickets:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.filters !== undefined) {
            data['filters'] = input.filters;
        }
        if (input.fields !== undefined) {
            data['fields'] = input.fields;
        }
        if (input.order_by !== undefined) {
            data['order_by'] = input.order_by;
        }
        if (input.order_dir !== undefined) {
            data['order_dir'] = input.order_dir;
        }
        if (input.slug !== undefined) {
            data['slug'] = input.slug;
        }
        if (input.type !== undefined) {
            data['type'] = input.type;
        }
        if (input.visibility !== undefined) {
            data['visibility'] = input.visibility;
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

        // https://developers.gorgias.com/reference/update-view
        const response = await nango.put({
            endpoint: `/api/views/${encodeURIComponent(input.id)}`,
            data,
            retries: 3
        });

        const providerView = OutputSchema.parse(response.data);
        return providerView;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
