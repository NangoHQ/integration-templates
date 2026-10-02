import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        limit: z
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .describe('Maximum number of lists to return per page. Brevo default is 10, maximum is 50. Example: 50'),
        offset: z.number().int().min(0).optional().describe('Index of the first list of the page, used with limit to paginate. Brevo default is 0. Example: 0'),
        folderId: z.number().int().optional().describe('Only return lists belonging to this folder ID. Omit to return lists from all folders. Example: 1'),
        sort: z.enum(['asc', 'desc']).optional().describe("Sort order of the results by record creation date. Brevo default is 'desc'.")
    })
    .describe('Optional pagination, filter, and sort options for listing contact lists.');

const ContactListSchema = z
    .object({
        id: z.number().int().describe('ID of the contact list. Example: 2'),
        name: z.string().describe('Name of the contact list. Example: "Your first list"'),
        folderId: z.number().int().describe('ID of the folder this contact list belongs to. Example: 1'),
        uniqueSubscribers: z.number().int().describe('Number of unique subscribed contacts in the list. Example: 1'),
        totalBlacklisted: z.number().int().describe('Number of blacklisted contacts in the list. Example: 0'),
        totalSubscribers: z.number().int().describe('Number of contacts in the list. Example: 0')
    })
    .describe('A contact list in the Brevo account.');

const OutputSchema = z
    .object({
        lists: z.array(ContactListSchema).describe('The contact lists in the account for the requested page.'),
        count: z.number().int().describe('Total number of contact lists in the account across all pages. Example: 1')
    })
    .describe('The requested page of contact lists plus the total list count.');

/**
 * @tags: [read]
 * @tagReason: Only performs a read-only GET to retrieve the account's contact lists.
 * @pitfalls: The totalSubscribers and totalBlacklisted fields are being deprecated by Brevo and may always return 0 regardless of actual list membership.
 */
const action = createAction({
    description: 'List the contact lists in the Brevo account',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/getlists-1
        const response = await nango.get({
            endpoint: '/contacts/lists',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.folderId !== undefined && { folderId: input.folderId }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
