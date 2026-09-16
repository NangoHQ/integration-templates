import { z } from 'zod';
import { createAction } from 'nango';

const ServiceReferenceInputSchema = z.object({
    id: z.string().describe('The service ID. Example: "PZW5AR6"'),
    type: z.string().describe('The service reference type. Example: "service_reference"')
});

const InputSchema = z
    .object({
        id: z.string().describe('The maintenance window ID. Example: "P8TH54O"'),
        start_time: z.string().optional().describe('ISO 8601 start time for the maintenance window. Example: "2026-09-16T10:00:00Z"'),
        end_time: z.string().optional().describe('ISO 8601 end time for the maintenance window. Must be after start_time. Example: "2026-09-16T12:00:00Z"'),
        description: z.string().optional().describe('Description for the maintenance window. Example: "Database migration window"'),
        services: z.array(ServiceReferenceInputSchema).optional().describe('Services to scope this maintenance window to.')
    })
    .describe('Input to update an existing PagerDuty maintenance window.');

const ReferenceOutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().optional()
});

const ProviderMaintenanceWindowSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    sequence_number: z.number().optional(),
    start_time: z.string(),
    end_time: z.string(),
    description: z.string().nullable().optional(),
    services: z.array(ReferenceOutputSchema).optional(),
    teams: z.array(ReferenceOutputSchema).optional(),
    created_by: ReferenceOutputSchema.nullable().optional()
});

const ProviderResponseSchema = z.object({
    maintenance_window: ProviderMaintenanceWindowSchema
});

const OutputSchema = z
    .object({
        id: z.string().describe('The maintenance window ID.'),
        type: z.string().describe('The object type, typically "maintenance_window".'),
        summary: z.string().optional().describe('A short summary of the maintenance window.'),
        self: z.string().optional().describe('The API URL for this maintenance window.'),
        html_url: z.string().optional().describe('The PagerDuty web UI URL for this maintenance window.'),
        sequence_number: z.number().optional().describe('The order in which this maintenance window was created.'),
        start_time: z.string().describe('The maintenance window start time in ISO 8601 format.'),
        end_time: z.string().describe('The maintenance window end time in ISO 8601 format.'),
        description: z.string().optional().describe('The description of the maintenance window.'),
        services: z
            .array(
                z.object({
                    id: z.string().describe('The service ID.'),
                    type: z.string().describe('The service reference type.'),
                    summary: z.string().optional().describe('A short summary of the service.'),
                    self: z.string().optional().describe('The API URL for this service.'),
                    html_url: z.string().optional().describe('The PagerDuty web UI URL for this service.')
                })
            )
            .optional()
            .describe('Services scoped to this maintenance window.'),
        teams: z
            .array(
                z.object({
                    id: z.string().describe('The team ID.'),
                    type: z.string().describe('The team reference type.'),
                    summary: z.string().optional().describe('A short summary of the team.'),
                    self: z.string().optional().describe('The API URL for this team.'),
                    html_url: z.string().optional().describe('The PagerDuty web UI URL for this team.')
                })
            )
            .optional()
            .describe('Teams associated with this maintenance window.'),
        created_by: z
            .object({
                id: z.string().describe('The user ID of the creator.'),
                type: z.string().describe('The user reference type.'),
                summary: z.string().optional().describe('A short summary of the creator.'),
                self: z.string().optional().describe('The API URL for the creator.'),
                html_url: z.string().optional().describe('The PagerDuty web UI URL for the creator.')
            })
            .optional()
            .describe('The user who created this maintenance window.')
    })
    .describe('The updated PagerDuty maintenance window.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing maintenance window via a PUT request to the PagerDuty API.
 * @pitfalls: If start_time is in the past, the provider silently shifts it to the current time; end_time must be in the future and after start_time.
 */
const action = createAction({
    description: "Update a maintenance window's time range, description, or scoped services.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/9064a86126b32-update-a-maintenance-window
        const response = await nango.put({
            endpoint: `/maintenance_windows/${encodeURIComponent(input.id)}`,
            data: {
                maintenance_window: {
                    type: 'maintenance_window',
                    ...(input.start_time !== undefined && { start_time: input.start_time }),
                    ...(input.end_time !== undefined && { end_time: input.end_time }),
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.services !== undefined && { services: input.services })
                }
            },
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from PagerDuty API: missing or malformed maintenance_window object.'
            });
        }

        const providerWindow = parsedResponse.data.maintenance_window;

        return {
            id: providerWindow.id,
            type: providerWindow.type,
            ...(providerWindow.summary != null && { summary: providerWindow.summary }),
            ...(providerWindow.self != null && { self: providerWindow.self }),
            ...(providerWindow.html_url != null && { html_url: providerWindow.html_url }),
            ...(providerWindow.sequence_number !== undefined && { sequence_number: providerWindow.sequence_number }),
            start_time: providerWindow.start_time,
            end_time: providerWindow.end_time,
            ...(providerWindow.description != null && { description: providerWindow.description }),
            ...(providerWindow.services !== undefined && {
                services: providerWindow.services.map((service) => ({
                    id: service.id,
                    type: service.type,
                    ...(service.summary !== undefined && { summary: service.summary }),
                    ...(service.self !== undefined && { self: service.self }),
                    ...(service.html_url !== undefined && { html_url: service.html_url })
                }))
            }),
            ...(providerWindow.teams !== undefined && {
                teams: providerWindow.teams.map((team) => ({
                    id: team.id,
                    type: team.type,
                    ...(team.summary !== undefined && { summary: team.summary }),
                    ...(team.self !== undefined && { self: team.self }),
                    ...(team.html_url !== undefined && { html_url: team.html_url })
                }))
            }),
            ...(providerWindow.created_by != null && {
                created_by: {
                    id: providerWindow.created_by.id,
                    type: providerWindow.created_by.type,
                    ...(providerWindow.created_by.summary !== undefined && { summary: providerWindow.created_by.summary }),
                    ...(providerWindow.created_by.self !== undefined && { self: providerWindow.created_by.self }),
                    ...(providerWindow.created_by.html_url !== undefined && { html_url: providerWindow.created_by.html_url })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
