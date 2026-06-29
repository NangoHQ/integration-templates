import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Transcript ID. Example: "abc123"'),
    title: z.string().describe('New meeting title. Example: "Weekly Sync"')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            updateMeetingTitle: z.object({
                title: z.string()
            })
        })
        .nullable()
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
    description: 'Update the title of a meeting transcript.',
    version: '1.0.0',
    input: InputSchema,
    output: z.boolean(),
    scopes: [],

    exec: async (nango, input): Promise<boolean> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/mutation/update-meeting-title
            endpoint: '/graphql',
            data: {
                query: 'mutation($input: UpdateMeetingTitleInput!) { updateMeetingTitle(input: $input) { title } }',
                variables: {
                    input: {
                        id: input.id,
                        title: input.title
                    }
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            const firstError = providerResponse.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: firstError.code || 'graphql_error',
                    message: firstError.message
                });
            }
        }

        if (providerResponse.data && providerResponse.data.updateMeetingTitle.title) {
            return true;
        }

        return false;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
