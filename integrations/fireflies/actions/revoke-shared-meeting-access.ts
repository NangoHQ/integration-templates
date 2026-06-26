import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meeting_id: z.string().describe('The unique identifier of the meeting / transcript.'),
    email: z.string().describe('The email address of the user whose shared access should be revoked.')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        revokeSharedMeetingAccess: z.object({
            success: z.boolean(),
            message: z.string()
        })
    })
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Revoke a previously shared meeting access.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.fireflies.ai/graphql-api/mutation/revoke-shared-meeting-access
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `mutation($input: RevokeSharedMeetingAccessInput!) { revokeSharedMeetingAccess(input: $input) { success message } }`,
                variables: {
                    input: {
                        meeting_id: input.meeting_id,
                        email: input.email
                    }
                }
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.data.revokeSharedMeetingAccess.success,
            message: providerResponse.data.revokeSharedMeetingAccess.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
