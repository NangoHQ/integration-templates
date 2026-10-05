import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        folderId: z.number().int().positive().describe('ID of the contact folder to retrieve. Example: 1')
    })
    .describe('Identifies the Brevo contact folder to retrieve');

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the contact folder. Example: 1'),
        name: z.string().describe('Name of the contact folder. Example: "Your first folder"'),
        uniqueSubscribers: z.number().describe('Number of unique subscribed contacts in the folder. Example: 0'),
        totalBlacklisted: z
            .number()
            .optional()
            .describe('Number of blacklisted contacts in the folder. Deprecated by Brevo: currently returned as 0 and scheduled for removal.'),
        totalSubscribers: z
            .number()
            .optional()
            .describe('Number of contacts in the folder. Deprecated by Brevo: currently returned as 0 and scheduled for removal.')
    })
    .describe('Details of a single Brevo contact folder');

const ProviderFolderSchema = z.object({
    id: z.number(),
    name: z.string(),
    uniqueSubscribers: z.number(),
    totalBlacklisted: z.number().optional(),
    totalSubscribers: z.number().optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads a single contact folder's details from Brevo; performs no provider mutations.
 * @pitfalls: Brevo is deprecating totalSubscribers and totalBlacklisted, which may be dropped from the response or defaulted to 0, so treat them as unreliable and use uniqueSubscribers for subscriber counts.
 */
const action = createAction({
    description: "Retrieve a single contact folder's details by ID.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/getfolder-1
        const response = await nango.get<z.infer<typeof ProviderFolderSchema>>({
            endpoint: `/contacts/folders/${input.folderId}`,
            retries: 3
        });

        const folder = ProviderFolderSchema.parse(response.data);

        return {
            id: folder.id,
            name: folder.name,
            uniqueSubscribers: folder.uniqueSubscribers,
            ...(folder.totalBlacklisted !== undefined && { totalBlacklisted: folder.totalBlacklisted }),
            ...(folder.totalSubscribers !== undefined && { totalSubscribers: folder.totalSubscribers })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
