import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meeting_id: z.string().describe('Meeting ID. Example: "abc123"'),
    action: z.enum(['pause_recording', 'resume_recording']).describe('Action to perform. Example: "pause_recording"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    action: z.string()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            updateMeetingState: z
                .object({
                    success: z.boolean(),
                    action: z.string()
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                code: z.string().optional(),
                friendly: z.boolean().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Pause or resume a live meeting recording.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/mutation/update-meeting-state
            endpoint: '/graphql',
            data: {
                query: 'mutation UpdateMeetingState($input: UpdateMeetingStateInput!) { updateMeetingState(input: $input) { success action } }',
                variables: {
                    input: {
                        meeting_id: input.meeting_id,
                        action: input.action
                    }
                }
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            const firstError = providerResponse.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: firstError.code ?? 'graphql_error',
                    message: firstError.message
                });
            }
        }

        if (!providerResponse.data?.updateMeetingState) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Fireflies API: missing updateMeetingState data.'
            });
        }

        return {
            success: providerResponse.data.updateMeetingState.success,
            action: providerResponse.data.updateMeetingState.action
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
