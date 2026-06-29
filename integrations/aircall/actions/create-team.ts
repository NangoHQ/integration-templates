import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the team to create. Example: "Support USA"')
});

const ProviderTeamSchema = z.object({
    id: z.number(),
    name: z.string(),
    direct_link: z.string(),
    created_at: z.string(),
    users: z.array(z.unknown())
});

const OutputSchema = z.object({
    team: ProviderTeamSchema
});

const action = createAction({
    description: 'Create a team in Aircall.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        method: 'POST',
        path: '/actions/create-team'
    },
    scopes: ['public_api'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.aircall.io/api-references/#create-a-team
            endpoint: '/v1/teams',
            data: {
                name: input.name
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Aircall API when creating team.'
            });
        }

        const providerResponse = OutputSchema.parse(response.data);
        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
