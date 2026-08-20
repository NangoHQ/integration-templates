import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the canned response folder.')
    })
    .describe('Input for creating a canned response folder in Freshdesk.');

const ProviderCreateFolderResponseSchema = z.object({
    id: z.number(),
    name: z.string()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique identifier of the created canned response folder.'),
        name: z.string().describe('Name of the created canned response folder.')
    })
    .describe('Output of a created canned response folder in Freshdesk.');

/**
 * @tags: [write]
 * @tagReason: Creates a new canned response folder in the Freshdesk account.
 * @pitfalls: No delete endpoint is documented for this resource, and folder names must be unique across the account.
 */
const action = createAction({
    description: 'Create a canned response folder in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.freshdesk.com/api/#create_canned_response_folder
            endpoint: '/api/v2/canned_response_folders',
            data: {
                name: input.name
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create/mutation; retries must be 0
            retries: 0
        });

        const providerResponse = ProviderCreateFolderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            name: providerResponse.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
