import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the maintenance window to retrieve. Example: "P8TH54O"')
    })
    .describe('Input for retrieving a single maintenance window by ID.');

const ProviderReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the referenced resource.'),
    type: z.string().describe('The type of the resource reference.'),
    summary: z.string().nullable().optional().describe('A brief summary of the referenced resource.'),
    self: z.string().nullable().optional().describe('The API URL of the referenced resource.'),
    html_url: z.string().nullable().optional().describe('The PagerDuty web URL of the referenced resource.')
});

const ProviderMaintenanceWindowSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    start_time: z.string(),
    end_time: z.string(),
    description: z.string().nullable().optional(),
    services: z.array(ProviderReferenceSchema).nullable().optional(),
    teams: z.array(ProviderReferenceSchema).nullable().optional(),
    created_by: ProviderReferenceSchema.nullable().optional(),
    sequence_number: z.number().nullable().optional()
});

const ProviderResponseSchema = z.object({
    maintenance_window: ProviderMaintenanceWindowSchema
});

const ReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the service.'),
    type: z.string().describe('The type of the resource reference.'),
    summary: z.string().optional().describe('A brief summary of the service.'),
    self: z.string().optional().describe('The API URL of the service.'),
    html_url: z.string().optional().describe('The PagerDuty web URL of the service.')
});

const MaintenanceWindowSchema = z.object({
    id: z.string().describe('The unique identifier of the maintenance window.'),
    type: z.string().describe('The type of the resource.'),
    summary: z.string().optional().describe('A brief summary of the maintenance window.'),
    self: z.string().optional().describe('The API URL of the maintenance window.'),
    html_url: z.string().optional().describe('The PagerDuty web URL of the maintenance window.'),
    start_time: z.string().describe('The start time of the maintenance window in ISO 8601 format.'),
    end_time: z.string().describe('The end time of the maintenance window in ISO 8601 format.'),
    description: z.string().optional().describe('A description of the maintenance window.'),
    services: z.array(ReferenceSchema).optional().describe('The services associated with this maintenance window.'),
    teams: z.array(ReferenceSchema).optional().describe('The teams associated with this maintenance window.'),
    created_by: ReferenceSchema.optional().describe('The user who created the maintenance window.'),
    sequence_number: z.number().optional().describe('The sequence number of the maintenance window.')
});

const OutputSchema = z
    .object({
        maintenance_window: MaintenanceWindowSchema.describe('The retrieved maintenance window object.')
    })
    .describe('Output containing the retrieved maintenance window.');

function normalizeReference(ref: z.infer<typeof ProviderReferenceSchema>) {
    return {
        id: ref.id,
        type: ref.type,
        ...(ref.summary != null && { summary: ref.summary }),
        ...(ref.self != null && { self: ref.self }),
        ...(ref.html_url != null && { html_url: ref.html_url })
    };
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a single maintenance window from the PagerDuty API without making any mutations.
 */
const action = createAction({
    description: 'Retrieve a single maintenance window.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['services.read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/REST/openapiv3.json/paths/~1maintenance_windows~1%7Bid%7D/get
            endpoint: `/maintenance_windows/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const providerWindow = parsed.maintenance_window;

        return {
            maintenance_window: {
                id: providerWindow.id,
                type: providerWindow.type,
                ...(providerWindow.summary != null && { summary: providerWindow.summary }),
                ...(providerWindow.self != null && { self: providerWindow.self }),
                ...(providerWindow.html_url != null && { html_url: providerWindow.html_url }),
                start_time: providerWindow.start_time,
                end_time: providerWindow.end_time,
                ...(providerWindow.description != null && { description: providerWindow.description }),
                ...(providerWindow.services != null && { services: providerWindow.services.map(normalizeReference) }),
                ...(providerWindow.teams != null && { teams: providerWindow.teams.map(normalizeReference) }),
                ...(providerWindow.created_by != null && { created_by: normalizeReference(providerWindow.created_by) }),
                ...(providerWindow.sequence_number != null && { sequence_number: providerWindow.sequence_number })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
