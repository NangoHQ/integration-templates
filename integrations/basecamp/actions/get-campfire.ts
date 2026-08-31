import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('Project ID that owns the Campfire.'),
        chatId: z.number().describe('Chat ID of the Campfire. Found in the project dock entry where name == "chat".')
    })
    .describe('Input for retrieving a project Campfire.');

const BucketSchema = z
    .object({
        id: z.number().describe('Bucket ID.'),
        name: z.string().describe('Bucket name.'),
        type: z.string().describe('Bucket type.')
    })
    .describe('Project bucket that contains the Campfire.');

const CompanySchema = z
    .object({
        id: z.number().describe('Company ID.'),
        name: z.string().describe('Company name.')
    })
    .describe('Company associated with the Campfire creator.');

const CreatorSchema = z
    .object({
        id: z.number().describe('Person ID.'),
        attachable_sgid: z.string().describe('Attachable SGID for mentions.'),
        name: z.string().describe('Full name.'),
        personable_type: z.string().describe('Personable type.'),
        title: z.string().nullable().describe('Job title.'),
        tagline: z.string().nullable().describe('Tagline or bio snippet.'),
        location: z.string().nullable().describe('Location.'),
        created_at: z.string().describe('Creation timestamp.'),
        updated_at: z.string().describe('Last update timestamp.'),
        email_address: z.string().optional().describe('Email address, omitted for some integration-type people.'),
        bio: z.string().nullable().describe('Bio.'),
        admin: z.boolean().describe('Whether the person is an admin.'),
        owner: z.boolean().describe('Whether the person is the account owner.'),
        client: z.boolean().describe('Whether the person is a client.'),
        employee: z.boolean().describe('Whether the person is an employee.'),
        time_zone: z.string().describe('Time zone.'),
        avatar_url: z.string().describe('Avatar URL.'),
        company: CompanySchema.optional().describe('Company, omitted for people without an associated company.'),
        can_ping: z.boolean().describe('Whether the person can be pinged.'),
        can_manage_projects: z.boolean().describe('Whether the person can manage projects.'),
        can_manage_people: z.boolean().describe('Whether the person can manage people.'),
        can_access_timesheet: z.boolean().describe('Whether the person can access timesheets.'),
        can_access_hill_charts: z.boolean().describe('Whether the person can access hill charts.')
    })
    .describe('Person who created the Campfire.');

const OutputSchema = z
    .object({
        id: z.number().describe('Campfire ID.'),
        status: z.string().describe('Status of the Campfire.'),
        visible_to_clients: z.boolean().describe('Whether the Campfire is visible to clients.'),
        created_at: z.string().describe('Creation timestamp.'),
        updated_at: z.string().describe('Last update timestamp.'),
        title: z.string().describe('Title of the Campfire.'),
        inherits_status: z.boolean().describe('Whether the Campfire inherits its parent status.'),
        type: z.string().describe('Type of the Campfire.'),
        url: z.string().describe('API URL of the Campfire.'),
        app_url: z.string().describe('App URL of the Campfire.'),
        bookmark_url: z.string().describe('Bookmark URL.'),
        subscription_url: z.string().describe('Subscription URL.'),
        position: z.number().optional().describe('Position in the project dock.'),
        bucket: BucketSchema,
        creator: CreatorSchema,
        topic: z.string().describe('Topic or name of the chat room.'),
        lines_url: z.string().describe('URL to list Campfire lines.'),
        files_url: z.string().describe('URL to list Campfire uploads.')
    })
    .describe('Campfire (chat room) details returned by the Basecamp API.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a project's Campfire details from the Basecamp API without mutating any data.
 * @pitfalls: The Chat tool must be enabled in the project dock or the endpoint returns a 404.
 */
const action = createAction({
    description: "Get a project's Campfire (chat room).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://github.com/basecamp/bc3-api/blob/master/sections/campfires.md#get-a-campfire
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/chats/${encodeURIComponent(input.chatId)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campfire not found.'
            });
        }

        const providerCampfire = OutputSchema.parse(response.data);
        return providerCampfire;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
