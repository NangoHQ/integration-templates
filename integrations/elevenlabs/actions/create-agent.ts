import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().optional(),
    conversation_config: z.object({}).passthrough(),
    tags: z.array(z.string()).optional(),
    platform_settings: z.object({}).passthrough().optional(),
    workflow: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    agent_id: z.string()
});

const action = createAction({
    description: 'Create a Conversational AI agent.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['convai'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://elevenlabs.io/docs/eleven-agents/api-reference/agents/create
            endpoint: '/v1/convai/agents/create',
            data: {
                name: input.name,
                conversation_config: input.conversation_config,
                tags: input.tags,
                platform_settings: input.platform_settings,
                workflow: input.workflow
            },
            retries: 3
        });

        const output = OutputSchema.parse(response.data);
        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
