import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the maintenance window to retrieve. Example: "P8TH54O"')
    })
    .describe('Input for retrieving a single maintenance window by ID.');

const ServiceReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the service.'),
    type: z.string().describe('The type of the resource reference.'),
    summary: z.string().optional().describe('A brief summary of the service.'),
    self: z.string().optional().describe('The API URL of the service.'),
    html_url: z.string().nullable().optional().describe('The PagerDuty web URL of the service.')
});

const TeamReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the team.'),
    type: z.string().describe('The type of the resource reference.'),
    summary: z.string().optional().describe('A brief summary of the team.'),
    self: z.string().optional().describe('The API URL of the team.'),
    html_url: z.string().nullable().optional().describe('The PagerDuty web URL of the team.')
});

const UserReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the user.'),
    type: z.string().describe('The type of the resource reference.'),
    summary: z.string().optional().describe('A brief summary of the user.'),
    self: z.string().optional().describe('The API URL of the user.'),
    html_url: z.string().nullable().optional().describe('The PagerDuty web URL of the user.')
});

const MaintenanceWindowSchema = z.object({
    id: z.string().describe('The unique identifier of the maintenance window.'),
    type: z.string().describe('The type of the resource.'),
    summary: z.string().optional().describe('A brief summary of the maintenance window.'),
    self: z.string().optional().describe('The API URL of the maintenance window.'),
    html_url: z.string().nullable().optional().describe('The PagerDuty web URL of the maintenance window.'),
    start_time: z.string().describe('The start time of the maintenance window in ISO 8601 format.'),
    end_time: z.string().describe('The end time of the maintenance window in ISO 8601 format.'),
    description: z.string().nullable().optional().describe('A description of the maintenance window.'),
    services: z.array(ServiceReferenceSchema).describe('The services associated with this maintenance window.'),
    teams: z.array(TeamReferenceSchema).describe('The teams associated with this maintenance window.'),
    created_by: UserReferenceSchema.optional().describe('The user who created the maintenance window.'),
    sequence_number: z.number().optional().describe('The sequence number of the maintenance window.')
});

const OutputSchema = z
    .object({
        maintenance_window: MaintenanceWindowSchema.describe('The retrieved maintenance window object.')
    })
    .describe('Output containing the retrieved maintenance window.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single maintenance window from the PagerDuty API without making any mutations.
 */
const action = createAction({
    description: 'Retrieve a single maintenance window.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/REST/openapiv3.json/paths/~1maintenance_windows~1%7Bid%7D/get
            endpoint: `/maintenance_windows/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
