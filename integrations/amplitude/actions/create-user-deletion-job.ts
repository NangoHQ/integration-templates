import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        amplitude_ids: z.array(z.number()).optional().describe('Amplitude IDs for the users to delete. Up to 100 total with user_ids.'),
        user_ids: z.array(z.string()).optional().describe('User IDs for the users to delete. Up to 100 total with amplitude_ids.'),
        requester: z.string().optional().describe('The internal user who requested the deletion.'),
        ignore_invalid_id: z.boolean().optional().describe('When true, ignore invalid IDs and add found users to the job.'),
        delete_from_org: z.boolean().optional().describe('When true, delete users across the entire organization.'),
        include_mapped_user_ids: z.boolean().optional().describe('When true, returns the valid user_id values that correspond to a supplied amplitude_id.')
    })
    .refine(
        (data) => {
            const amplitudeCount = data.amplitude_ids?.length || 0;
            const userCount = data.user_ids?.length || 0;
            return amplitudeCount > 0 || userCount > 0;
        },
        {
            message: 'At least one of amplitude_ids or user_ids must be provided.'
        }
    );

const ProviderAmplitudeIdSchema = z.object({
    amplitude_id: z.number(),
    requested_on_day: z.string(),
    requester: z.string(),
    user_id: z.string().optional()
});

const ProviderResponseSchema = z.object({
    day: z.string(),
    status: z.string(),
    amplitude_ids: z.array(ProviderAmplitudeIdSchema).optional(),
    user_ids: z.array(z.string()).optional(),
    app: z.union([z.string(), z.number()]).optional(),
    invalid_ids: z.array(z.union([z.string(), z.number()])).optional()
});

const OutputSchema = z.object({
    day: z.string(),
    status: z.string(),
    amplitude_ids: z
        .array(
            z.object({
                amplitude_id: z.number(),
                requested_on_day: z.string(),
                requester: z.string(),
                user_id: z.string().optional()
            })
        )
        .optional(),
    user_ids: z.array(z.string()).optional(),
    app: z.union([z.string(), z.number()]).optional(),
    invalid_ids: z.array(z.union([z.string(), z.number()])).optional()
});

const action = createAction({
    description: 'Create a user privacy deletion job.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const amplitudeCount = input.amplitude_ids?.length || 0;
        const userCount = input.user_ids?.length || 0;
        if (amplitudeCount + userCount > 100) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Total number of amplitude_ids and user_ids must not exceed 100.'
            });
        }

        const response = await nango.post({
            // https://amplitude.com/docs/apis/analytics/user-privacy
            endpoint: '/api/2/deletions/users',
            data: {
                ...(input.amplitude_ids !== undefined && { amplitude_ids: input.amplitude_ids }),
                ...(input.user_ids !== undefined && { user_ids: input.user_ids }),
                ...(input.requester !== undefined && { requester: input.requester }),
                ...(input.ignore_invalid_id !== undefined && { ignore_invalid_id: input.ignore_invalid_id ? 'True' : 'False' }),
                ...(input.delete_from_org !== undefined && { delete_from_org: input.delete_from_org ? 'True' : 'False' }),
                ...(input.include_mapped_user_ids !== undefined && { include_mapped_user_ids: input.include_mapped_user_ids ? 'True' : 'False' })
            },
            retries: 10
        });

        if (typeof response.data === 'string') {
            throw new nango.ActionError({
                type: 'no_valid_ids',
                message: response.data
            });
        }

        const responsePayload = Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : response.data;

        const providerResponse = ProviderResponseSchema.parse(responsePayload);

        return {
            day: providerResponse.day,
            status: providerResponse.status,
            ...(providerResponse.amplitude_ids !== undefined && {
                amplitude_ids: providerResponse.amplitude_ids.map((id) => ({
                    amplitude_id: id.amplitude_id,
                    requested_on_day: id.requested_on_day,
                    requester: id.requester,
                    ...(id.user_id !== undefined && { user_id: id.user_id })
                }))
            }),
            ...(providerResponse.user_ids !== undefined && { user_ids: providerResponse.user_ids }),
            ...(providerResponse.app !== undefined && { app: providerResponse.app }),
            ...(providerResponse.invalid_ids !== undefined && { invalid_ids: providerResponse.invalid_ids })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
