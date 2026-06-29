import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    agent_id: z.string().describe('The ID of the agent to delete. Example: "agent_123"')
});

const OutputSchema = z.object({});

const action = createAction({
    description: 'Delete a Conversational AI agent.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://elevenlabs.io/docs/api-reference/agents/delete
        const response = await nango.delete({
            endpoint: `/v1/convai/agents/${encodeURIComponent(input.agent_id)}`,
            retries: 10
        });

        if (typeof response.data === 'object' && response.data !== null) {
            z.object({}).parse(response.data);
        }

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
