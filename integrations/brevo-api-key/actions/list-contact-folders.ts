import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().min(1).optional().describe('Maximum number of folders to return in a single page. Defaults to 10 when omitted. Example: 50'),
        offset: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Index of the first folder to return, combined with limit to page through the folders. Defaults to 0 when omitted. Example: 0'),
        sort: z.enum(['asc', 'desc']).optional().describe('Sort order of the folders by creation date. Defaults to "desc" (newest first) when omitted.')
    })
    .describe('Pagination and sorting options for listing contact folders. All fields are optional.');

const FolderSchema = z.object({
    id: z.number().describe('Unique ID of the folder. Example: 1'),
    name: z.string().describe('Name of the folder. Example: "Your first folder"'),
    uniqueSubscribers: z.number().optional().describe('Number of unique subscribed contacts in the folder. Deprecated by Brevo.'),
    totalSubscribers: z.number().optional().describe('Number of subscribed contacts in the folder. Being dropped by Brevo and may default to 0.'),
    totalBlacklisted: z.number().optional().describe('Number of blacklisted contacts in the folder. Being dropped by Brevo and may default to 0.')
});

const OutputSchema = z
    .object({
        folders: z.array(FolderSchema).describe('The page of contact folders returned for the requested limit and offset.'),
        count: z.number().describe('Total number of contact folders in the account, across all pages.')
    })
    .describe("The account's contact folders for the requested page, plus the total folder count.");

// Internal schema for the raw Brevo response. The docs mark both envelope keys as
// optional, so they are parsed defensively and normalized in the returned output.
const ProviderResponseSchema = z.object({
    folders: z
        .array(
            z.object({
                id: z.number(),
                name: z.string(),
                uniqueSubscribers: z.number().optional(),
                totalSubscribers: z.number().optional(),
                totalBlacklisted: z.number().optional()
            })
        )
        .optional(),
    count: z.number().optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET of the account's contact folders and creates, modifies, or deletes nothing in Brevo.
 * @pitfalls: Brevo is deprecating the folder subscriber counts: uniqueSubscribers is deprecated and totalSubscribers/totalBlacklisted are being dropped (they will default to 0), so do not rely on them for real membership numbers. Only the first 10 folders are returned by default; pass limit and offset to page through the rest.
 */
const action = createAction({
    description: "List the account's contact folders (the organizational containers for lists)",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // List all folders: https://developers.brevo.com/reference/getfolders-1
            endpoint: '/contacts/folders',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        };
        const response = await nango.get(config);
        const parsed = ProviderResponseSchema.parse(response.data);
        const folders = parsed.folders ?? [];

        return {
            folders: folders.map((folder) => ({
                id: folder.id,
                name: folder.name,
                ...(folder.uniqueSubscribers !== undefined && { uniqueSubscribers: folder.uniqueSubscribers }),
                ...(folder.totalSubscribers !== undefined && { totalSubscribers: folder.totalSubscribers }),
                ...(folder.totalBlacklisted !== undefined && { totalBlacklisted: folder.totalBlacklisted })
            })),
            count: parsed.count ?? folders.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
