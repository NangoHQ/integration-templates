import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('ID of the canned response folder to update. Example: 82000044383'),
        name: z.string().describe('New name for the canned response folder.')
    })
    .describe('Input to update a canned response folder in Freshdesk.');

const ProviderFolderSchema = z.object({
    id: z.number(),
    name: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the updated canned response folder.'),
        name: z.string().describe('Updated name of the canned response folder.')
    })
    .describe('Output of an updated canned response folder in Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Modifies an existing canned response folder name on the provider.
 */
const action = createAction({
    description: 'Update a canned response folder in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.freshdesk.com/api/#update_canned_response_folder
            endpoint: `/api/v2/canned_response_folders/${encodeURIComponent(input.id)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        const providerFolder = ProviderFolderSchema.parse(response.data);

        return {
            id: providerFolder.id,
            name: providerFolder.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
