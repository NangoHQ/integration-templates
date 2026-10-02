import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        folderId: z.number().int().positive().describe('ID of the contact folder to rename. Example: 1'),
        name: z.string().min(1).describe('New name for the folder. Example: "VIP Customers"')
    })
    .describe('Input for renaming a Brevo contact folder');

const ProviderFolderSchema = z.object({
    id: z.number(),
    name: z.string(),
    totalBlacklisted: z.number().optional(),
    totalSubscribers: z.number().optional(),
    uniqueSubscribers: z.number().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the renamed folder. Example: 1'),
        name: z.string().describe('Name of the folder after the rename.'),
        totalBlacklisted: z
            .number()
            .optional()
            .describe('Number of blacklisted contacts across the lists in the folder. Brevo is phasing this field out, so it may always report 0.'),
        totalSubscribers: z
            .number()
            .optional()
            .describe('Number of contacts across the lists in the folder. Brevo is phasing this field out, so it may always report 0.'),
        uniqueSubscribers: z.number().optional().describe('Number of unique contacts across the lists in the folder.')
    })
    .describe('The renamed contact folder, read back after the update');

/**
 * @tags: [read, write]
 * @tagReason: Renames the folder with a PUT, then reads it back with a GET to return its updated state.
 * @pitfalls: Renaming a folder to the name it already has fails with a 400 error rather than succeeding as a no-op, so the new name must differ from the current one. Brevo is dropping support for the totalSubscribers and totalBlacklisted folder fields, so they may always report 0.
 */
const action = createAction({
    description: 'Rename a contact folder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateConfig: ProxyConfiguration = {
            // https://developers.brevo.com/reference/update-folder
            endpoint: `/contacts/folders/${input.folderId}`,
            data: { name: input.name },
            // Safe to retry: Brevo rejects a rename to the folder's current name with a 400 instead of applying it twice, so a retried PUT cannot repeat the mutation.
            retries: 3
        };
        await nango.put(updateConfig);

        // The update returns 204 No Content, so read the folder back to return its new state.
        const getConfig: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get-folder
            endpoint: `/contacts/folders/${input.folderId}`,
            retries: 3
        };
        const response = await nango.get(getConfig);

        const folder = ProviderFolderSchema.parse(response.data);

        return {
            id: folder.id,
            name: folder.name,
            ...(folder.totalBlacklisted !== undefined && { totalBlacklisted: folder.totalBlacklisted }),
            ...(folder.totalSubscribers !== undefined && { totalSubscribers: folder.totalSubscribers }),
            ...(folder.uniqueSubscribers !== undefined && { uniqueSubscribers: folder.uniqueSubscribers })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
