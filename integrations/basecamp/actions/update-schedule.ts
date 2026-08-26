import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the Basecamp project that contains the schedule.'),
        scheduleId: z.number().describe('The ID of the schedule to update.'),
        includeDueAssignments: z.boolean().describe('Whether the schedule should include due dates from to-dos, cards, and steps.')
    })
    .describe("Input for updating a schedule's include_due_assignments setting.");

const BucketSchema = z
    .object({
        id: z.number().describe('The project ID.'),
        name: z.string().describe('The project name.'),
        type: z.string().describe('The resource type, typically "Project".')
    })
    .describe('The project this schedule belongs to.');

const CreatorSchema = z
    .object({
        id: z.number().describe('The person ID.'),
        name: z.string().describe("The person's full name."),
        email_address: z.string().nullable().optional().describe("The person's email address, if exposed by the provider.")
    })
    .describe('The person who created this schedule.');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the schedule.'),
        status: z.string().describe('The current status of the schedule, e.g. "active" or "drafted".'),
        visible_to_clients: z.boolean().describe('Whether the schedule is visible to client users.'),
        created_at: z.string().describe('ISO 8601 timestamp when the schedule was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the schedule was last updated.'),
        title: z.string().describe('The schedule title.'),
        inherits_status: z.boolean().describe('Whether the schedule inherits its parent project status.'),
        type: z.string().describe('The resource type, typically "Schedule".'),
        url: z.string().describe('The canonical API URL for this schedule.'),
        app_url: z.string().describe('The Basecamp web application URL for this schedule.'),
        bookmark_url: z.string().describe("The API URL for the current user's bookmark of this schedule."),
        position: z.number().describe('The position of the schedule in the project dock.'),
        bucket: BucketSchema,
        creator: CreatorSchema,
        include_due_assignments: z.boolean().describe('Whether the schedule includes due dates from to-dos, cards, and steps.'),
        entries_count: z.number().describe('The number of schedule entries.'),
        entries_url: z.string().describe("The API URL for this schedule's entries.")
    })
    .describe('The updated schedule resource.');

/**
 * @tags: [write]
 * @tagReason: Mutates the schedule by updating its include_due_assignments flag.
 * @pitfalls: The schedule exists and is mutable even when its Calendar tool tile is disabled in the project dock.
 */
const action = createAction({
    description: 'Change whether a schedule includes due dates from to-dos, cards, and steps.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://github.com/basecamp/bc3-api/blob/master/sections/schedules.md#update-a-schedule
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/schedules/${encodeURIComponent(input.scheduleId)}.json`,
            data: {
                schedule: {
                    include_due_assignments: input.includeDueAssignments
                }
            },
            retries: 3
        });

        const schedule = OutputSchema.parse(response.data);
        return schedule;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
