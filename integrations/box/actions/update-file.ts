import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_id: z.string().describe('The unique identifier that represents a file. Example: "2231571097476"'),
    name: z.string().optional().describe('An optional different name for the file. This can be used to rename the file.'),
    description: z.string().max(256).optional().describe('The description for a file. Max length 256 characters.'),
    parent: z
        .object({
            id: z.string().describe('The ID of parent folder. Use "0" for the root folder.')
        })
        .optional()
        .describe('An optional new parent folder for the file. This can be used to move the file to a new folder.'),
    tags: z.array(z.string()).min(1).max(100).optional().describe('The tags for this item. There is a limit of 100 tags per item.')
});

const ProviderFileSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    size: z.number().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    parent: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    tags: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    size: z.number().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    parent: z
        .object({
            id: z.string(),
            name: z.string().optional()
        })
        .optional(),
    tags: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Update a file in Box. This can be used to rename or move a file.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['root_readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input['name'] !== undefined) {
            requestBody['name'] = input['name'];
        }

        if (input['description'] !== undefined) {
            requestBody['description'] = input['description'];
        }

        if (input['parent'] !== undefined) {
            requestBody['parent'] = input['parent'];
        }

        if (input['tags'] !== undefined) {
            requestBody['tags'] = input['tags'];
        }

        // https://developer.box.com/reference/put-files-id/
        const response = await nango.put({
            endpoint: `/2.0/files/${input.file_id}`,
            data: requestBody,
            retries: 3
        });

        const providerFile = ProviderFileSchema.parse(response.data);

        return {
            id: providerFile.id,
            type: providerFile.type,
            ...(providerFile.name !== undefined && { name: providerFile.name }),
            ...(providerFile.description !== undefined && { description: providerFile.description }),
            ...(providerFile.size !== undefined && { size: providerFile.size }),
            ...(providerFile.created_at !== undefined && { created_at: providerFile.created_at }),
            ...(providerFile.modified_at !== undefined && { modified_at: providerFile.modified_at }),
            ...(providerFile.parent !== undefined && { parent: providerFile.parent }),
            ...(providerFile.tags !== undefined && { tags: providerFile.tags })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
