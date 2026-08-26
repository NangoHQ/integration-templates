import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The project (bucket) ID.'),
        messageBoardId: z
            .number()
            .describe('The message board ID from the project\'s dock entry where name == "message_board". The tool must be enabled first.')
    })
    .describe("Input for getting a project's message board.");

const BucketSchema = z.object({
    id: z.number(),
    name: z.string(),
    type: z.string()
});

const CreatorSchema = z.object({
    id: z.number(),
    attachable_sgid: z.string(),
    name: z.string(),
    personable_type: z.string(),
    title: z.string().nullable(),
    tagline: z.string().nullable(),
    location: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    email_address: z.string().optional(),
    bio: z.string().nullable(),
    admin: z.boolean(),
    owner: z.boolean(),
    client: z.boolean(),
    employee: z.boolean(),
    time_zone: z.string(),
    avatar_url: z.string(),
    company: z
        .object({
            id: z.number(),
            name: z.string()
        })
        .optional(),
    can_ping: z.boolean(),
    can_manage_projects: z.boolean(),
    can_manage_people: z.boolean(),
    can_access_timesheet: z.boolean(),
    can_access_hill_charts: z.boolean()
});

const ProviderMessageBoardSchema = z.object({
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
    bookmark_url: z.string(),
    position: z.number(),
    bucket: BucketSchema,
    creator: CreatorSchema,
    messages_count: z.number(),
    messages_url: z.string(),
    app_messages_url: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The message board ID.'),
        status: z.string().describe('The status of the message board, e.g., "active" or "trashed".'),
        visible_to_clients: z.boolean().describe('Whether the message board is visible to client users.'),
        created_at: z.string().describe('ISO 8601 timestamp when the message board was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the message board was last updated.'),
        title: z.string().describe('The title of the message board.'),
        inherits_status: z.boolean().describe('Whether the message board inherits its status from the parent project.'),
        type: z.string().describe('The Basecamp resource type, e.g., "Message::Board".'),
        url: z.string().describe('The API URL for this message board.'),
        app_url: z.string().describe('The Basecamp web app URL for this message board.'),
        bookmark_url: z.string().describe("The API URL for the current user's bookmark of this message board."),
        position: z.number().describe('The position of the message board in the project dock.'),
        bucket: z
            .object({
                id: z.number().describe('The project (bucket) ID.'),
                name: z.string().describe('The project name.'),
                type: z.string().describe('The resource type, e.g., "Project".')
            })
            .describe('The project that contains this message board.'),
        creator: z
            .object({
                id: z.number().describe("The creator's person ID."),
                attachable_sgid: z.string().describe('The attachable signed global ID for the creator.'),
                name: z.string().describe("The creator's full name."),
                personable_type: z.string().describe('The type of person, e.g., "User".'),
                title: z.string().nullable().describe("The creator's job title."),
                tagline: z.string().nullable().describe("The creator's tagline."),
                location: z.string().nullable().describe("The creator's location."),
                created_at: z.string().describe("ISO 8601 timestamp when the creator's account was created."),
                updated_at: z.string().describe("ISO 8601 timestamp when the creator's account was last updated."),
                email_address: z.string().optional().describe("The creator's email address, omitted for some integration-type people."),
                bio: z.string().nullable().describe("The creator's biography."),
                admin: z.boolean().describe('Whether the creator is an account admin.'),
                owner: z.boolean().describe('Whether the creator is the account owner.'),
                client: z.boolean().describe('Whether the creator is a client user.'),
                employee: z.boolean().describe('Whether the creator is an employee.'),
                time_zone: z.string().describe("The creator's IANA time zone."),
                avatar_url: z.string().describe("The URL for the creator's avatar image."),
                company: z
                    .object({
                        id: z.number().describe('The company ID.'),
                        name: z.string().describe('The company name.')
                    })
                    .optional()
                    .describe("The creator's company, omitted for people without an associated company."),
                can_ping: z.boolean().describe('Whether the creator can be pinged.'),
                can_manage_projects: z.boolean().describe('Whether the creator can manage projects.'),
                can_manage_people: z.boolean().describe('Whether the creator can manage people.'),
                can_access_timesheet: z.boolean().describe('Whether the creator can access timesheets.'),
                can_access_hill_charts: z.boolean().describe('Whether the creator can access hill charts.')
            })
            .describe('The person who created this message board.'),
        messages_count: z.number().describe('The total number of messages in this message board.'),
        messages_url: z.string().describe('The API URL to list messages in this message board.'),
        app_messages_url: z.string().describe('The Basecamp web app URL to view messages in this message board.')
    })
    .describe("A project's message board with its message count.");

/**
 * @tags: [read]
 * @tagReason: Reads the message board from the Basecamp API.
 * @pitfalls: The message board tool must be enabled on the project before its ID is available in the project's dock; if the dock entry is missing, enable the tool first.
 */
const action = createAction({
    description: "Get a project's message board (the container for all its messages) and message count.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const url = `buckets/${encodeURIComponent(String(input.projectId))}/message_boards/${encodeURIComponent(String(input.messageBoardId))}.json`;

        // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/message_boards.md
        const response = await nango.get({
            endpoint: url,
            retries: 3
        });

        const messageBoard = ProviderMessageBoardSchema.parse(response.data);

        return {
            id: messageBoard.id,
            status: messageBoard.status,
            visible_to_clients: messageBoard.visible_to_clients,
            created_at: messageBoard.created_at,
            updated_at: messageBoard.updated_at,
            title: messageBoard.title,
            inherits_status: messageBoard.inherits_status,
            type: messageBoard.type,
            url: messageBoard.url,
            app_url: messageBoard.app_url,
            bookmark_url: messageBoard.bookmark_url,
            position: messageBoard.position,
            bucket: {
                id: messageBoard.bucket.id,
                name: messageBoard.bucket.name,
                type: messageBoard.bucket.type
            },
            creator: {
                id: messageBoard.creator.id,
                attachable_sgid: messageBoard.creator.attachable_sgid,
                name: messageBoard.creator.name,
                personable_type: messageBoard.creator.personable_type,
                title: messageBoard.creator.title,
                tagline: messageBoard.creator.tagline,
                location: messageBoard.creator.location,
                created_at: messageBoard.creator.created_at,
                updated_at: messageBoard.creator.updated_at,
                email_address: messageBoard.creator.email_address,
                bio: messageBoard.creator.bio,
                admin: messageBoard.creator.admin,
                owner: messageBoard.creator.owner,
                client: messageBoard.creator.client,
                employee: messageBoard.creator.employee,
                time_zone: messageBoard.creator.time_zone,
                avatar_url: messageBoard.creator.avatar_url,
                ...(messageBoard.creator.company !== undefined && {
                    company: {
                        id: messageBoard.creator.company.id,
                        name: messageBoard.creator.company.name
                    }
                }),
                can_ping: messageBoard.creator.can_ping,
                can_manage_projects: messageBoard.creator.can_manage_projects,
                can_manage_people: messageBoard.creator.can_manage_people,
                can_access_timesheet: messageBoard.creator.can_access_timesheet,
                can_access_hill_charts: messageBoard.creator.can_access_hill_charts
            },
            messages_count: messageBoard.messages_count,
            messages_url: messageBoard.messages_url,
            app_messages_url: messageBoard.app_messages_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
