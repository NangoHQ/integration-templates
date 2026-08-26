import { z } from 'zod';
import { createAction } from 'nango';

const CompanySchema = z.object({
    id: z.number().describe('Company ID'),
    name: z.string().describe('Company name')
});

const PersonSchema = z
    .object({
        id: z.number().describe('Person ID'),
        name: z.string().describe('Person name'),
        email_address: z.string().optional().describe('Email address, omitted for some integration-type people'),
        personable_type: z.string().describe('Person type'),
        title: z.string().nullable().describe('Job title'),
        tagline: z.string().nullable().describe('Tagline'),
        location: z.string().nullable().describe('Location'),
        bio: z.string().nullable().describe('Bio'),
        admin: z.boolean().describe('Whether the person is an admin'),
        owner: z.boolean().describe('Whether the person is an owner'),
        client: z.boolean().describe('Whether the person is a client'),
        employee: z.boolean().describe('Whether the person is an employee'),
        time_zone: z.string().describe('Time zone'),
        avatar_url: z.string().describe('Avatar URL'),
        created_at: z.string().describe('Creation timestamp'),
        updated_at: z.string().describe('Last updated timestamp'),
        can_ping: z.boolean().describe('Whether the person can be pinged'),
        can_manage_projects: z.boolean().describe('Whether the person can manage projects'),
        can_manage_people: z.boolean().describe('Whether the person can manage people'),
        can_access_timesheet: z.boolean().describe('Whether the person can access timesheets'),
        can_access_hill_charts: z.boolean().describe('Whether the person can access hill charts'),
        company: CompanySchema.optional().describe('Company information, omitted for people without an associated company')
    })
    .passthrough();

const ParentSchema = z.object({
    id: z.number().describe('Parent column ID'),
    title: z.string().describe('Parent column title'),
    type: z.string().describe('Parent type'),
    url: z.string().describe('Parent API URL'),
    app_url: z.string().describe('Parent app URL')
});

const BucketSchema = z.object({
    id: z.number().describe('Project ID'),
    name: z.string().describe('Project name'),
    type: z.string().describe('Project type')
});

const StepSchema = z
    .object({
        id: z.number().describe('Step ID'),
        status: z.string().describe('Step status'),
        title: z.string().describe('Step title'),
        created_at: z.string().describe('Step creation timestamp'),
        updated_at: z.string().describe('Step last updated timestamp'),
        type: z.string().describe('Step type'),
        url: z.string().describe('Step API URL'),
        app_url: z.string().describe('Step app URL'),
        position: z.number().describe('Step position within the card'),
        completed: z.boolean().describe('Whether the step is completed'),
        due_on: z.string().nullable().describe('Step due date'),
        assignees: z.array(PersonSchema).describe('People assigned to the step'),
        completion_url: z.string().describe('URL to mark the step as complete'),
        parent: z
            .object({
                id: z.number().describe('Parent card ID'),
                title: z.string().describe('Parent card title'),
                type: z.string().describe('Parent type'),
                url: z.string().describe('Parent API URL'),
                app_url: z.string().describe('Parent app URL')
            })
            .describe('Parent card information'),
        bucket: BucketSchema.describe('Project bucket information'),
        creator: PersonSchema.describe('Person who created the step')
    })
    .passthrough();

const InputSchema = z
    .object({
        projectId: z.string().describe('Project (bucket) ID that contains the card. Example: "48644099"'),
        cardId: z.string().describe('Card ID to retrieve. Example: "10239442914"')
    })
    .describe('Input for retrieving a single Card Table card.');

const OutputSchema = z
    .object({
        id: z.number().describe('Card ID'),
        status: z.string().describe('Card status. Example: "active"'),
        visible_to_clients: z.boolean().describe('Whether the card is visible to clients'),
        created_at: z.string().describe('Creation timestamp in ISO 8601 format'),
        updated_at: z.string().describe('Last updated timestamp in ISO 8601 format'),
        title: z.string().describe('Card title'),
        inherits_status: z.boolean().describe('Whether the card inherits its parent column status'),
        type: z.string().describe('Card type'),
        url: z.string().describe('Card API URL'),
        app_url: z.string().describe('Card app URL'),
        bookmark_url: z.string().describe('Bookmark URL'),
        subscription_url: z.string().describe('Subscription URL'),
        comments_count: z.number().describe('Number of comments'),
        comments_url: z.string().describe('Comments API URL'),
        boosts_count: z.number().describe('Number of boosts'),
        boosts_url: z.string().describe('Boosts API URL'),
        position: z.number().describe('Position within the column'),
        parent: ParentSchema.describe('Parent column information'),
        bucket: BucketSchema.describe('Project bucket information'),
        creator: PersonSchema.describe('Person who created the card'),
        description: z.string().describe('Card description'),
        description_attachments: z.array(z.object({}).passthrough()).describe('Description attachments'),
        completed: z.boolean().describe('Whether the card is completed'),
        content: z.string().nullable().describe('Card content or body'),
        due_on: z.string().nullable().describe('Due date in ISO 8601 format'),
        assignees: z.array(PersonSchema).describe('People assigned to the card'),
        completion_subscribers: z.array(z.object({}).passthrough()).describe('Completion subscribers'),
        completion_url: z.string().describe('URL to mark the card as complete'),
        comment_count: z.number().describe('Number of comments on the card'),
        steps: z.array(StepSchema).describe('Checklist steps on the card')
    })
    .passthrough()
    .describe('Output for a single Card Table card.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single existing Card Table card by ID.
 * @pitfalls: The response contains both `description` (plain text summary) and `content` (rich text body, may be null) fields with independent values; `completed` is read-only and can only be toggled via the returned `completion_url`.
 */
const action = createAction({
    description: 'Retrieve a single Card Table card.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/card_table_cards.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/cards/${encodeURIComponent(input.cardId)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Card ${input.cardId} not found in project ${input.projectId}.`
            });
        }

        const card = OutputSchema.parse(response.data);
        return card;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
