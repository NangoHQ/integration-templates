import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The identifier of the initiative to update. Example: "7bf5d043-8868-454c-9da8-6948a8d21972"'),
    name: z.string().optional().describe('The name of the initiative.'),
    description: z.string().nullable().optional().describe('The description of the initiative. Set to null to clear.'),
    ownerId: z.string().nullable().optional().describe('The identifier of the user that owns the initiative. Set to null to clear.'),
    status: z.string().nullable().optional().describe('The status of the initiative. Example: "backlog", "planned", "in_progress", "completed", "canceled".'),
    targetDate: z.string().nullable().optional().describe('The target date of the initiative in ISO 8601 format. Set to null to clear.'),
    targetDateResolution: z.string().nullable().optional().describe('The resolution of the target date. Example: "day", "week", "month", "quarter", "year".'),
    color: z.string().nullable().optional().describe('The color of the initiative. Example: "#FF0000".'),
    icon: z.string().nullable().optional().describe('The icon of the initiative.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional()
});

const ProviderTeamSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional()
});

const ProviderInitiativeSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    targetDate: z.string().nullable().optional(),
    targetDateResolution: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    startedAt: z.string().nullable().optional(),
    completedAt: z.string().nullable().optional(),
    canceledAt: z.string().nullable().optional(),
    owner: ProviderUserSchema.nullable().optional(),
    leadTeam: ProviderTeamSchema.nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            initiativeUpdate: z.object({
                success: z.boolean(),
                initiative: ProviderInitiativeSchema.nullable().optional()
            })
        })
        .nullable()
        .optional(),
    errors: z.array(z.object({ message: z.string() })).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    targetDate: z.string().optional(),
    targetDateResolution: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    canceledAt: z.string().optional(),
    owner: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    leadTeam: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update an existing Linear initiative.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation InitiativeUpdate($id: String!, $input: InitiativeUpdateInput!) {
                initiativeUpdate(id: $id, input: $input) {
                    success
                    initiative {
                        id
                        name
                        description
                        status
                        targetDate
                        targetDateResolution
                        color
                        icon
                        createdAt
                        updatedAt
                        startedAt
                        completedAt
                        canceledAt
                        owner {
                            id
                            name
                        }
                        leadTeam {
                            id
                            name
                        }
                    }
                }
            }
        `;

        const updateInput = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.ownerId !== undefined && { ownerId: input.ownerId }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.targetDate !== undefined && { targetDate: input.targetDate }),
            ...(input.targetDateResolution !== undefined && { targetDateResolution: input.targetDateResolution }),
            ...(input.color !== undefined && { color: input.color }),
            ...(input.icon !== undefined && { icon: input.icon })
        };

        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: {
                    id: input.id,
                    input: updateInput
                }
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            const errorMessage = providerResponse.errors[0]?.message || 'Unknown provider error.';
            throw new nango.ActionError({
                type: 'provider_error',
                message: errorMessage
            });
        }

        if (!providerResponse.data || !providerResponse.data.initiativeUpdate) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Initiative not found after update.'
            });
        }

        const updateResult = providerResponse.data.initiativeUpdate;

        if (!updateResult.success) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Linear reported that the initiative update was not successful.'
            });
        }

        if (!updateResult.initiative) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Initiative not found after update.'
            });
        }

        const initiative = updateResult.initiative;

        return {
            id: initiative.id,
            ...(initiative.name != null && { name: initiative.name }),
            ...(initiative.description != null && { description: initiative.description }),
            ...(initiative.status != null && { status: initiative.status }),
            ...(initiative.targetDate != null && { targetDate: initiative.targetDate }),
            ...(initiative.targetDateResolution != null && { targetDateResolution: initiative.targetDateResolution }),
            ...(initiative.color != null && { color: initiative.color }),
            ...(initiative.icon != null && { icon: initiative.icon }),
            ...(initiative.createdAt != null && { createdAt: initiative.createdAt }),
            ...(initiative.updatedAt != null && { updatedAt: initiative.updatedAt }),
            ...(initiative.startedAt != null && { startedAt: initiative.startedAt }),
            ...(initiative.completedAt != null && { completedAt: initiative.completedAt }),
            ...(initiative.canceledAt != null && { canceledAt: initiative.canceledAt }),
            ...(initiative.owner != null && {
                owner: {
                    id: initiative.owner.id,
                    ...(initiative.owner.name != null && { name: initiative.owner.name })
                }
            }),
            ...(initiative.leadTeam != null && {
                leadTeam: {
                    id: initiative.leadTeam.id,
                    ...(initiative.leadTeam.name != null && { name: initiative.leadTeam.name })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
