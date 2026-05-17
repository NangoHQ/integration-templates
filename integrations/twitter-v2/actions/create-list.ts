import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the list. Example: "Tech News"'),
    description: z.string().optional().describe('Description for the list. Example: "Top tech journalists and publications"'),
    private: z.boolean().optional().describe('Whether the list is private. If true, only the owner can view the list.')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        id: z.string(),
        name: z.string()
    })
});

const OutputSchema = z.object({
    id: z.string().describe('Unique identifier of the created list.'),
    name: z.string().describe('Name of the created list.')
});

type Input = z.infer<typeof InputSchema>;
type InputKey = keyof Input;

const action = createAction({
    description: 'Create a list in Twitter/X',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-list',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['list.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Safe property access through intermediate object
        const safeInput: Record<string, unknown> = input;
        const payload: Record<string, unknown> = {
            name: safeInput['name']
        };

        const descriptionKey: InputKey = 'description';
        if (safeInput[descriptionKey] !== undefined) {
            payload['description'] = safeInput[descriptionKey];
        }

        const privateKey: InputKey = 'private';
        if (safeInput[privateKey] !== undefined) {
            payload['private'] = safeInput[privateKey];
        }

        // https://docs.x.com/x-api/lists/manage-lists/api-reference/post-lists
        const response = await nango.post({
            endpoint: '/2/lists',
            data: payload,
            retries: 10
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            id: parsed.data.id,
            name: parsed.data.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
