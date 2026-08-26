import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The project (bucket) ID that contains the Campfire.'),
        chatId: z.number().describe('The Campfire (chat) ID.'),
        lineId: z.number().describe('The Campfire line ID to retrieve.')
    })
    .describe('Input for retrieving a single Campfire line.');

const ParentSchema = z.object({
    id: z.number().describe('The ID of the parent Campfire.'),
    title: z.string().describe('The title of the parent Campfire.'),
    type: z.string().describe('The type of the parent Campfire.'),
    url: z.string().describe('The API URL of the parent Campfire.'),
    app_url: z.string().describe('The app URL of the parent Campfire.')
});

const BucketSchema = z.object({
    id: z.number().describe('The project ID.'),
    name: z.string().describe('The project name.'),
    type: z.string().describe('The type of the bucket.')
});

const CompanySchema = z.object({
    id: z.number().describe('The company ID.'),
    name: z.string().describe('The company name.')
});

const CreatorSchema = z.object({
    id: z.number().describe('The ID of the creator.'),
    attachable_sgid: z.string().optional().describe('The attachable SGID of the creator.'),
    name: z.string().describe('The name of the creator.'),
    personable_type: z.string().optional().describe('The type of the creator (e.g., User).'),
    title: z.union([z.string(), z.null()]).optional().describe('The job title of the creator.'),
    tagline: z.union([z.string(), z.null()]).optional().describe('The tagline of the creator.'),
    location: z.union([z.string(), z.null()]).optional().describe('The location of the creator.'),
    created_at: z.string().optional().describe('When the creator was added.'),
    updated_at: z.string().optional().describe('When the creator was last updated.'),
    email_address: z.string().optional().describe('The email address of the creator, omitted for some integration-type people.'),
    bio: z.union([z.string(), z.null()]).optional().describe('The bio of the creator.'),
    admin: z.boolean().optional().describe('Whether the creator is an admin.'),
    owner: z.boolean().optional().describe('Whether the creator is the account owner.'),
    client: z.boolean().optional().describe('Whether the creator is a client.'),
    employee: z.boolean().optional().describe('Whether the creator is an employee.'),
    time_zone: z.string().optional().describe('The time zone of the creator.'),
    avatar_url: z.string().optional().describe('The avatar URL of the creator.'),
    company: CompanySchema.optional().describe('The company of the creator.'),
    can_ping: z.boolean().optional().describe('Whether the creator can be pinged.'),
    can_manage_projects: z.boolean().optional().describe('Whether the creator can manage projects.'),
    can_manage_people: z.boolean().optional().describe('Whether the creator can manage people.'),
    can_access_timesheet: z.boolean().optional().describe('Whether the creator can access timesheets.'),
    can_access_hill_charts: z.boolean().optional().describe('Whether the creator can access hill charts.')
});

const AttachmentSchema = z.object({
    title: z.string().describe('The file name of the attachment.'),
    url: z.string().describe('The API URL of the attachment preview.'),
    filename: z.string().describe('The original file name of the attachment.'),
    content_type: z.string().describe('The MIME type of the attachment.'),
    byte_size: z.number().describe('The size of the attachment in bytes.'),
    download_url: z.string().describe('The direct download URL for the attachment.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the Campfire line.'),
        status: z.string().describe('The status of the line (active, archived, trashed).'),
        visible_to_clients: z.boolean().describe('Whether the line is visible to clients.'),
        created_at: z.string().describe('When the line was created.'),
        updated_at: z.string().describe('When the line was last updated.'),
        title: z.string().describe('The title of the line.'),
        inherits_status: z.boolean().describe('Whether the line inherits its parent status.'),
        type: z.string().describe('The type of the line (e.g., Chat::Lines::RichText, Chat::Lines::Upload).'),
        url: z.string().describe('The API URL of the line.'),
        app_url: z.string().describe('The app URL of the line.'),
        bookmark_url: z.string().describe('The bookmark URL of the line.'),
        boosts_count: z.number().describe('The number of boosts on the line.'),
        boosts_url: z.string().describe('The API URL for boosts on the line.'),
        parent: ParentSchema.describe('The parent Campfire transcript.'),
        bucket: BucketSchema.describe('The project bucket containing the line.'),
        creator: CreatorSchema.describe('The person who created the line.'),
        content: z.string().optional().describe('The body content of the line. Omitted for file-upload lines; see attachments instead.'),
        attachments: z.array(AttachmentSchema).optional().describe('The uploaded files for a file-upload line. Only present when type is Chat::Lines::Upload.')
    })
    .describe('A single Campfire line retrieved from Basecamp.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single Campfire line from the Basecamp API.
 * @pitfalls: Campfire lines are permanently deleted (not trashed) when removed, so this action returns a 404 for deleted lines that cannot be recovered via the API.
 */
const action = createAction({
    description: 'Retrieve a single Campfire line.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/campfires.md#get-a-campfire-line
        const response = await nango.get({
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/chats/${encodeURIComponent(String(input.chatId))}/lines/${encodeURIComponent(String(input.lineId))}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Campfire line not found',
                projectId: input.projectId,
                chatId: input.chatId,
                lineId: input.lineId
            });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
