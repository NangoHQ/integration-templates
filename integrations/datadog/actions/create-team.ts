import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the team. Example: "Engineering"'),
    handle: z.string().describe('The handle of the team. Example: "engineering"')
});

const ProviderTeamAttributesSchema = z.object({
    name: z.string(),
    handle: z.string()
});

const ProviderTeamDataSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: ProviderTeamAttributesSchema
});

const ProviderResponseSchema = z.object({
    data: ProviderTeamDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    handle: z.string()
});

const action = createAction({
    description: 'Create a new team.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams_read', 'teams_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/teams/#create-a-team
            endpoint: 'v2/team',
            data: {
                data: {
                    type: 'team',
                    attributes: {
                        name: input.name,
                        handle: input.handle
                    }
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.safeParse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape',
                details: providerResponse.error.message
            });
        }

        const team = providerResponse.data.data;

        return {
            id: team.id,
            type: team.type,
            name: team.attributes.name,
            handle: team.attributes.handle
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
