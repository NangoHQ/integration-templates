import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    agent_id: z.string().describe('The ID of an agent. This is returned on agent creation. Example: "agent_8301kvx0de7afd18wvh6xcq9nwqc"'),
    version_id: z.string().optional().describe('The ID of the agent version to use'),
    branch_id: z.string().optional().describe('The ID of the branch to use')
});

const OutputSchema = z
    .object({
        agent_id: z.string(),
        name: z.string().optional(),
        conversation_config: z.record(z.string(), z.unknown()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        platform_settings: z.record(z.string(), z.unknown()).optional(),
        secrets: z.array(z.record(z.string(), z.unknown())).optional(),
        access_info: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a Conversational AI agent',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/get-agent' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://elevenlabs.io/docs/api-reference/agents/get
            endpoint: `/v1/convai/agents/${encodeURIComponent(input.agent_id)}`,
            params: {
                ...(input.version_id !== undefined && { version_id: input.version_id }),
                ...(input.branch_id !== undefined && { branch_id: input.branch_id })
            },
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Agent not found',
                agent_id: input.agent_id
            });
        }

        const providerResponse = OutputSchema.parse(response.data);
        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
