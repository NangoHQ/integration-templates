import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the linked file. Example: "Design Spec"'),
    url: z.string().describe('URL of the linked file. Example: "https://example.com/doc"'),
    type: z.enum(['url', 'google', 'dropbox', 'box', 'onedrive']).describe('Type of linked file.'),
    description: z.string().optional().describe('Optional description.')
});

const ProviderLinkedFileSchema = z.object({
    id: z.number(),
    name: z.string(),
    url: z.string(),
    type: z.string(),
    description: z.string().optional(),
    story_ids: z.array(z.number()).optional()
});

const OutputSchema = ProviderLinkedFileSchema;

const action = createAction({
    description: "Attach a URL-based linked file. Associate it with stories afterward via update-story's linked_file_ids.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.shortcut.com/api/rest/v3
            endpoint: '/api/v3/linked-files',
            data: {
                name: input.name,
                url: input.url,
                type: input.type,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 1
        };

        const response = await nango.post(config);

        const linkedFile = ProviderLinkedFileSchema.parse(response.data);

        return linkedFile;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
