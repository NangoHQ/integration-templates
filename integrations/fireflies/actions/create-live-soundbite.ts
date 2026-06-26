import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meeting_id: z.string().describe('The ID of the live meeting to create the soundbite for. Example: "abc123"'),
    prompt: z
        .string()
        .min(5)
        .max(255)
        .describe('Natural language description of the soundbite to create. Min 5, max 255 characters. Example: "Create a soundbite from the last 2 minutes"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        createLiveSoundbite: z.object({
            success: z.boolean()
        })
    })
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Create a soundbite/clip during an active live meeting',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.fireflies.ai/graphql-api/mutation/create-live-soundbite
            endpoint: '/graphql',
            data: {
                query: 'mutation CreateLiveSoundbite($input: CreateLiveSoundbiteInput!) { createLiveSoundbite(input: $input) { success } }',
                variables: {
                    input: {
                        meeting_id: input.meeting_id,
                        prompt: input.prompt
                    }
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.data.createLiveSoundbite.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
