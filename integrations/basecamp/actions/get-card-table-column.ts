import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        project_id: z.string().describe('The project bucket ID. Example: "48644099"'),
        column_id: z.string().describe('The card table column ID. Example: "10239340944"')
    })
    .describe('Input for retrieving a single card table column.');

const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string(),
    email_address: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
    admin: z.boolean().optional(),
    owner: z.boolean().optional(),
    client: z.boolean().optional(),
    time_zone: z.string().nullable().optional()
});

const ProviderParentSchema = z.object({
    id: z.number(),
    title: z.string(),
    type: z.string(),
    url: z.string(),
    app_url: z.string()
});

const ProviderBucketSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string()
});

const ProviderColumnSchema = z.object({
    id: z.number(),
    status: z.string(),
    visible_to_clients: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    inherits_status: z.boolean(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    bookmark_url: z.string().optional(),
    subscription_url: z.string().optional(),
    parent: ProviderParentSchema,
    bucket: ProviderBucketSchema,
    creator: ProviderPersonSchema.optional(),
    description: z.string().nullable().optional(),
    subscribers: z.array(ProviderPersonSchema),
    color: z.string().nullable().optional(),
    cards_count: z.number(),
    comment_count: z.number(),
    cards_url: z.string(),
    on_hold: z.boolean().optional()
});

const PersonSchema = z.object({
    id: z.number().describe('The unique ID of the person.'),
    name: z.string().describe('The full name of the person.'),
    email_address: z.string().optional().describe('The email address of the person.'),
    title: z.string().optional().describe('The job title of the person.'),
    avatar_url: z.string().optional().describe("The URL of the person's avatar image."),
    admin: z.boolean().optional().describe('Whether the person is an account admin.'),
    owner: z.boolean().optional().describe('Whether the person is the account owner.'),
    client: z.boolean().optional().describe('Whether the person is a client user.'),
    time_zone: z.string().optional().describe("The person's IANA time zone.")
});

const ParentSchema = z.object({
    id: z.number().describe('The ID of the parent card table.'),
    title: z.string().describe('The title of the parent card table.'),
    type: z.string().describe('The type of the parent card table.'),
    url: z.string().describe('The API URL of the parent card table.'),
    app_url: z.string().describe('The Basecamp app URL of the parent card table.')
});

const BucketSchema = z.object({
    id: z.number().describe('The project bucket ID.'),
    name: z.string().describe('The name of the project.'),
    type: z.string().describe('The type of the bucket, typically "Project".')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the card table column.'),
        status: z.string().describe('The status of the column, e.g. "active" or "drafted".'),
        visible_to_clients: z.boolean().describe('Whether the column is visible to client users.'),
        created_at: z.string().describe('ISO 8601 timestamp when the column was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the column was last updated.'),
        title: z.string().describe('The title of the column.'),
        inherits_status: z.boolean().describe('Whether the column inherits its status from the parent.'),
        type: z.string().describe('The type of the column, e.g. "Kanban::Triage".'),
        url: z.string().describe('The API URL for the column.'),
        app_url: z.string().describe('The Basecamp app URL for the column.'),
        bookmark_url: z.string().optional().describe('The bookmark URL for the column.'),
        subscription_url: z.string().optional().describe('The subscription URL for the column.'),
        parent: ParentSchema.describe('The parent card table.'),
        bucket: BucketSchema.describe('The project containing this column.'),
        creator: PersonSchema.optional().describe('The person who created the column.'),
        description: z.string().optional().describe('The description of the column.'),
        subscribers: z.array(PersonSchema).describe('People subscribed to this column.'),
        color: z.string().optional().describe('The color of the column, if set.'),
        cards_count: z.number().describe('The number of cards in the column.'),
        comment_count: z.number().describe('The number of comments on the column.'),
        cards_url: z.string().describe('The API URL for the cards in this column.'),
        on_hold: z.boolean().optional().describe('Whether the column has an on-hold section.')
    })
    .describe('A single card table column from the Basecamp API.');

function normalizePerson(person: z.infer<typeof ProviderPersonSchema>): z.infer<typeof PersonSchema> {
    return {
        id: person.id,
        name: person.name,
        ...(person.email_address != null && { email_address: person.email_address }),
        ...(person.title != null && { title: person.title }),
        ...(person.avatar_url != null && { avatar_url: person.avatar_url }),
        ...(person.admin !== undefined && { admin: person.admin }),
        ...(person.owner !== undefined && { owner: person.owner }),
        ...(person.client !== undefined && { client: person.client }),
        ...(person.time_zone != null && { time_zone: person.time_zone })
    };
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a single card table column from the Basecamp API.
 */
const action = createAction({
    description: 'Retrieve a single Card Table column.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/card_table_columns.md#get-a-column
        const response = await nango.get({
            endpoint: `/buckets/${encodeURIComponent(input.project_id)}/card_tables/columns/${encodeURIComponent(input.column_id)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Card table column not found.',
                project_id: input.project_id,
                column_id: input.column_id
            });
        }

        const providerColumn = ProviderColumnSchema.parse(response.data);

        return {
            id: providerColumn.id,
            status: providerColumn.status,
            visible_to_clients: providerColumn.visible_to_clients,
            created_at: providerColumn.created_at,
            updated_at: providerColumn.updated_at,
            title: providerColumn.title,
            inherits_status: providerColumn.inherits_status,
            type: providerColumn.type,
            url: providerColumn.url,
            app_url: providerColumn.app_url,
            ...(providerColumn.bookmark_url !== undefined && { bookmark_url: providerColumn.bookmark_url }),
            ...(providerColumn.subscription_url !== undefined && { subscription_url: providerColumn.subscription_url }),
            parent: {
                id: providerColumn.parent.id,
                title: providerColumn.parent.title,
                type: providerColumn.parent.type,
                url: providerColumn.parent.url,
                app_url: providerColumn.parent.app_url
            },
            bucket: {
                id: providerColumn.bucket.id,
                name: providerColumn.bucket.name,
                type: providerColumn.bucket.type
            },
            ...(providerColumn.creator !== undefined && { creator: normalizePerson(providerColumn.creator) }),
            ...(providerColumn.description != null && { description: providerColumn.description }),
            subscribers: providerColumn.subscribers.map(normalizePerson),
            ...(providerColumn.color != null && { color: providerColumn.color }),
            cards_count: providerColumn.cards_count,
            comment_count: providerColumn.comment_count,
            cards_url: providerColumn.cards_url,
            ...(providerColumn.on_hold !== undefined && { on_hold: providerColumn.on_hold })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
