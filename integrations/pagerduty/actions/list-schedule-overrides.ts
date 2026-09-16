import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        schedule_id: z.string().describe('The ID of the schedule to list overrides for. Example: "P2LJD7G"'),
        since: z.string().describe('The start of the date range over which to search, in ISO 8601 format. Example: "2026-04-01T00:00:00Z"'),
        until: z.string().describe('The end of the date range over which to search, in ISO 8601 format. Example: "2026-05-30T00:00:00Z"'),
        editable: z.boolean().optional().describe('When true, only editable overrides are returned. Only future overrides are editable.'),
        overflow: z
            .boolean()
            .optional()
            .describe('When true, on-call schedule entries that pass the date range bounds will not be truncated at the bounds. Defaults to false.')
    })
    .describe('Input parameters for listing schedule overrides within a time window.');

const UserReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the user.'),
    type: z.string().describe('The type of the reference object, typically "user_reference".'),
    summary: z.string().optional().describe('A short summary or display name of the user.'),
    self: z.string().optional().describe('The API URL of the user resource.'),
    html_url: z.string().optional().describe('The PagerDuty web URL of the user resource.')
});

const OverrideSchema = z.object({
    id: z.string().describe('The unique identifier of the override.'),
    start: z.string().describe('The start date and time of the override in ISO 8601 format.'),
    end: z.string().describe('The end date and time of the override in ISO 8601 format.'),
    user: UserReferenceSchema.describe('The user who is on-call during this override.'),
    summary: z.string().optional().describe('A short summary or display name of the override.'),
    type: z.string().optional().describe('The type of the override object.'),
    self: z.string().optional().describe('The API URL of the override resource.'),
    html_url: z.string().optional().describe('The PagerDuty web URL of the override resource.')
});

const OutputSchema = z
    .object({
        overrides: z.array(OverrideSchema).describe('The list of schedule overrides within the requested time window.')
    })
    .describe('The list of schedule overrides returned for the requested schedule and time window.');

/**
 * @tags: [read]
 * @tagReason: Reads schedule overrides from the PagerDuty API without modifying provider state.
 * @pitfalls: Passing editable=true strips every field except id from each override; only future overrides are editable.
 */
const action = createAction({
    description: 'List overrides on a schedule within a time window.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schedules.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/6ba2725839fc3-list-overrides
        const response = await nango.get({
            endpoint: `/schedules/${encodeURIComponent(input.schedule_id)}/overrides`,
            params: {
                since: input.since,
                until: input.until,
                ...(input.editable !== undefined && { editable: String(input.editable) }),
                ...(input.overflow !== undefined && { overflow: String(input.overflow) })
            },
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || !('overrides' in raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from PagerDuty API: missing overrides field.'
            });
        }

        const parsed = OutputSchema.parse(raw);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
