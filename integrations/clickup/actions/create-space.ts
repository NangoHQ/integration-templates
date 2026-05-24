import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    team_id: z.string().describe('ClickUp team ID (workspace). Example: "90152560096"')
});

const InputSchema = z.object({
    name: z.string().describe('Name of the space. Example: "Engineering"'),
    team_id: z.string().optional().describe('ClickUp team ID (workspace). Uses connection metadata if not provided. Example: "90152560096"'),
    multiple_assignees: z.boolean().optional().describe('Whether tasks can have multiple assignees'),
    features: z
        .object({
            due_dates: z
                .object({
                    enabled: z.boolean().describe('Enable due dates'),
                    start_date: z.boolean().optional().describe('Enable start dates')
                })
                .optional(),
            time_tracking: z
                .object({
                    enabled: z.boolean().describe('Enable time tracking')
                })
                .optional(),
            tags: z
                .object({
                    enabled: z.boolean().describe('Enable tags')
                })
                .optional(),
            priorities: z
                .object({
                    enabled: z.boolean().describe('Enable priorities')
                })
                .optional()
        })
        .optional()
        .describe('Space features configuration')
});

const StatusSchema = z.object({
    id: z.string(),
    status: z.string(),
    color: z.string(),
    orderindex: z.number(),
    type: z.string()
});

const FeatureConfigSchema = z.object({
    enabled: z.boolean()
});

const FeatureWithStartDateSchema = z.object({
    enabled: z.boolean(),
    start_date: z.boolean().optional(),
    remap_due_dates: z.boolean().optional(),
    remap_closed_due_date: z.boolean().optional()
});

const FeaturesSchema = z.object({
    due_dates: FeatureWithStartDateSchema.optional(),
    time_tracking: FeatureConfigSchema.optional(),
    tags: FeatureConfigSchema.optional(),
    priorities: FeatureConfigSchema.optional(),
    reminders: z.unknown().optional(),
    checklists: z.unknown().optional(),
    custom_fields: z.unknown().optional(),
    dependency_warning: z.unknown().optional(),
    milestones: z.unknown().optional(),
    multiple_assignees: z.unknown().optional(),
    sprint_points: z.unknown().optional(),
    sprints: z.unknown().optional(),
    zoom: z.unknown().optional(),
    default_lists: z.unknown().optional(),
    default_task_types: z.unknown().optional()
});

const ProviderSpaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    statuses: z.array(StatusSchema),
    features: FeaturesSchema.optional(),
    multiple_assignees: z.boolean().optional(),
    archived: z.boolean().optional(),
    private: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    statuses: z.array(
        z.object({
            id: z.string(),
            status: z.string(),
            color: z.string(),
            orderindex: z.number(),
            type: z.string()
        })
    ),
    features: z
        .object({
            due_dates: z
                .object({
                    enabled: z.boolean(),
                    start_date: z.boolean().optional()
                })
                .optional(),
            time_tracking: z
                .object({
                    enabled: z.boolean()
                })
                .optional(),
            tags: z
                .object({
                    enabled: z.boolean()
                })
                .optional(),
            priorities: z
                .object({
                    enabled: z.boolean()
                })
                .optional()
        })
        .optional(),
    multiple_assignees: z.boolean().optional()
});

const action = createAction({
    description: 'Create a space in ClickUp.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-space',
        group: 'Spaces'
    },
    metadata: MetadataSchema,
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<{ team_id?: string }>();
        const teamId = input.team_id ?? metadata?.team_id;

        if (!teamId) {
            throw new nango.ActionError({
                type: 'invalid_input_or_metadata',
                message: 'team_id is required in input or connection metadata.'
            });
        }

        const requestBody: Record<string, unknown> = {
            name: input.name
        };

        if (input.multiple_assignees !== undefined) {
            requestBody['multiple_assignees'] = input.multiple_assignees;
        }

        if (input.features !== undefined) {
            requestBody['features'] = input.features;
        }

        // https://developer.clickup.com/reference/createspace
        const response = await nango.post({
            endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/space`,
            data: requestBody,
            retries: 3
        });

        const providerSpace = ProviderSpaceSchema.parse(response.data);

        return {
            id: providerSpace.id,
            name: providerSpace.name,
            statuses: providerSpace.statuses.map((status) => ({
                id: status.id,
                status: status.status,
                color: status.color,
                orderindex: status.orderindex,
                type: status.type
            })),
            ...(providerSpace.features !== undefined && {
                features: {
                    ...(providerSpace.features.due_dates !== undefined && {
                        due_dates: {
                            enabled: providerSpace.features.due_dates.enabled,
                            ...(providerSpace.features.due_dates.start_date !== undefined && {
                                start_date: providerSpace.features.due_dates.start_date
                            })
                        }
                    }),
                    ...(providerSpace.features.time_tracking !== undefined && {
                        time_tracking: {
                            enabled: providerSpace.features.time_tracking.enabled
                        }
                    }),
                    ...(providerSpace.features.tags !== undefined && {
                        tags: {
                            enabled: providerSpace.features.tags.enabled
                        }
                    }),
                    ...(providerSpace.features.priorities !== undefined && {
                        priorities: {
                            enabled: providerSpace.features.priorities.enabled
                        }
                    })
                }
            }),
            ...(providerSpace.multiple_assignees !== undefined && {
                multiple_assignees: providerSpace.multiple_assignees
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
