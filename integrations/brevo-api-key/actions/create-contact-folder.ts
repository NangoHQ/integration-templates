import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        name: z.string().min(1).describe('Name of the contact folder to create. Example: "Newsletter lists"')
    })
    .describe('Input for creating a new Brevo contact folder');

const ProviderCreateFolderResponseSchema = z.object({
    id: z.number()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Unique numeric ID of the newly created folder. Example: 5')
    })
    .describe('Result of creating a Brevo contact folder');

/**
 * @tags: [write]
 * @tagReason: Creates a new contact folder in the provider account (a provider mutation) and reads nothing.
 * @pitfalls: Folder names are not unique: creating a folder with a name that already exists succeeds and returns a new folder with a different id instead of a duplicate-name error.
 */
const action = createAction({
    description: 'Create a new contact folder to organize contact lists',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/createfolder
            endpoint: '/contacts/folders',
            data: {
                name: input.name
            },
            // Folder creation has no idempotency key; retrying after a lost response could create duplicate folders.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };

        const response = await nango.post(config);

        const folder = ProviderCreateFolderResponseSchema.parse(response.data);

        return {
            id: folder.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
