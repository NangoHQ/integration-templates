import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Project ID (bucket) that contains the schedule entry. Example: "48644099"'),
        entryId: z.string().describe('Schedule entry ID to retrieve. Example: "10239442734"')
    })
    .describe('Input for retrieving a single schedule entry.');

const ParentSchema = z
    .object({
        id: z.number().describe('Parent schedule ID.'),
        title: z.string().describe('Parent schedule title.'),
        type: z.string().describe('Parent resource type, e.g. "Schedule".'),
        url: z.string().describe('API URL of the parent schedule.'),
        app_url: z.string().describe('App URL of the parent schedule.')
    })
    .describe('Parent schedule object.');

const BucketSchema = z
    .object({
        id: z.number().describe('Project ID (bucket).'),
        name: z.string().describe('Project name.'),
        type: z.string().describe('Bucket type, e.g. "Project".')
    })
    .describe('Project (bucket) containing the entry.');

const CreatorSchema = z
    .object({
        id: z.number().describe('Creator person ID.'),
        name: z.string().describe('Creator name.'),
        email_address: z.string().optional().describe('Creator email address, omitted for some integration-type people.'),
        avatar_url: z.string().optional().describe('Creator avatar URL.')
    })
    .describe('Person who created the entry.');

const ParticipantSchema = z
    .object({
        id: z.number().describe('Participant person ID.'),
        name: z.string().describe('Participant name.'),
        email_address: z.string().optional().describe('Participant email address, omitted for some integration-type people.'),
        avatar_url: z.string().optional().describe('Participant avatar URL.')
    })
    .describe('Person participating in the schedule entry.');

const OutputSchema = z
    .object({
        id: z.number().describe('Schedule entry ID.'),
        status: z.string().describe('Entry status, e.g. "active" or "drafted".'),
        visible_to_clients: z.boolean().describe('Whether the entry is visible to clients.'),
        created_at: z.string().describe('ISO 8601 timestamp when the entry was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the entry was last updated.'),
        title: z.string().describe('Entry title.'),
        type: z.string().describe('Resource type, e.g. "Schedule::Entry".'),
        url: z.string().describe('API URL of the schedule entry.'),
        app_url: z.string().describe('App URL of the schedule entry.'),
        summary: z.string().describe('Short summary of the schedule entry.'),
        description: z.string().describe('Long-form description of the schedule entry.'),
        all_day: z.boolean().describe('Whether the entry spans the full day(s).'),
        highlighted: z.boolean().describe('Whether the entry is highlighted on the schedule.'),
        starts_at: z.string().describe('ISO 8601 start date/time of the entry.'),
        ends_at: z.string().describe('ISO 8601 end date/time of the entry.'),
        join_url: z.string().nullable().describe('Optional join URL (e.g. video call link).'),
        participants: z.array(ParticipantSchema).describe('People participating in the schedule entry.'),
        parent: ParentSchema.describe('Parent schedule object.'),
        bucket: BucketSchema.describe('Project (bucket) containing the entry.'),
        creator: CreatorSchema.describe('Person who created the entry.'),
        comments_count: z.number().describe('Number of comments on the entry.')
    })
    .describe('A single schedule entry retrieved from Basecamp.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single schedule entry by reading from the provider API.
 * @pitfalls: For recurring entries the response is the first occurrence rather than the recurring schedule itself; a 404 may mean a missing entry, insufficient permissions, or an inactive account subscription.
 */
const action = createAction({
    description: 'Retrieve a single schedule entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/schedule_entries.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/schedule_entries/${encodeURIComponent(input.entryId)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Schedule entry not found.',
                projectId: input.projectId,
                entryId: input.entryId
            });
        }

        const entry = OutputSchema.parse(response.data);
        return entry;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
