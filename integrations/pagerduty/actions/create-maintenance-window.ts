import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        start_time: z.string().describe('ISO 8601 timestamp for when the maintenance window begins.'),
        end_time: z.string().describe('ISO 8601 timestamp for when the maintenance window ends.'),
        description: z.string().optional().describe('Optional description for the maintenance window.'),
        services: z
            .array(
                z
                    .object({
                        id: z.string().describe('The PagerDuty service ID to suppress alerts for.')
                    })
                    .describe('A service reference to include in the maintenance window.')
            )
            .describe('List of services whose alerts will be suppressed during the window.')
    })
    .describe('Input to create a PagerDuty maintenance window.');

const ProviderServiceReferenceSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const ProviderUserReferenceSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const ProviderTeamReferenceSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const ProviderMaintenanceWindowSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    start_time: z.string(),
    end_time: z.string(),
    description: z.string().optional().nullable(),
    services: z.array(ProviderServiceReferenceSchema),
    created_by: ProviderUserReferenceSchema.optional(),
    teams: z.array(ProviderTeamReferenceSchema).optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique ID of the created maintenance window.'),
        type: z.string().optional().describe('The PagerDuty resource type.'),
        start_time: z.string().describe('ISO 8601 start time of the maintenance window.'),
        end_time: z.string().describe('ISO 8601 end time of the maintenance window.'),
        description: z.string().optional().describe('Description of the maintenance window.'),
        services: z
            .array(
                z
                    .object({
                        id: z.string().describe('The PagerDuty service ID.'),
                        summary: z.string().optional().describe('The service summary/name.')
                    })
                    .describe('A service included in the maintenance window.')
            )
            .describe('Services included in the maintenance window.'),
        created_by: z
            .object({
                id: z.string().describe('The user ID of the creator.'),
                summary: z.string().optional().describe('The user name of the creator.')
            })
            .optional()
            .describe('User who created the maintenance window.'),
        teams: z
            .array(
                z
                    .object({
                        id: z.string().describe('The team ID.'),
                        summary: z.string().optional().describe('The team name.')
                    })
                    .describe('A team associated with the maintenance window.')
            )
            .optional()
            .describe('Teams associated with the maintenance window.')
    })
    .describe('The created PagerDuty maintenance window.');

/**
 * @tags: [write]
 * @tagReason: Creates a maintenance window on the PagerDuty account.
 * @pitfalls: A start_time in the past is silently updated to the current time instead of being rejected.
 */
const action = createAction({
    description: 'Create a maintenance window suppressing alerts on one or more services for a time range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['services.write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/a450bc9b9ea6f-create-a-maintenance-window
            endpoint: '/maintenance_windows',
            data: {
                maintenance_window: {
                    type: 'maintenance_window',
                    start_time: input.start_time,
                    end_time: input.end_time,
                    ...(input.description !== undefined && { description: input.description }),
                    services: input.services.map((service) => ({
                        id: service.id,
                        type: 'service_reference'
                    }))
                }
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('maintenance_window' in response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from PagerDuty API when creating maintenance window.'
            });
        }

        const raw = response.data.maintenance_window;
        const providerMw = ProviderMaintenanceWindowSchema.parse(raw);

        return {
            id: providerMw.id,
            ...(providerMw.type !== undefined && { type: providerMw.type }),
            start_time: providerMw.start_time,
            end_time: providerMw.end_time,
            ...(providerMw.description != null && { description: providerMw.description }),
            services: providerMw.services.map((s) => ({
                id: s.id,
                ...(s.summary != null && { summary: s.summary })
            })),
            ...(providerMw.created_by !== undefined && {
                created_by: {
                    id: providerMw.created_by.id,
                    ...(providerMw.created_by.summary != null && { summary: providerMw.created_by.summary })
                }
            }),
            ...(providerMw.teams !== undefined && {
                teams: providerMw.teams.map((t) => ({
                    id: t.id,
                    ...(t.summary != null && { summary: t.summary })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
