import { z } from 'zod';
import { createAction } from 'nango';

// Input schema - optional limit parameter for Salesforce
const InputSchema = z.object({
    limit: z.number().optional().describe('Maximum number of records to return. Default varies by API version.')
});

// Salesforce recent item provider response schema
// Based on https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_recent.htm
const ProviderRecentItemSchema = z
    .object({
        Id: z.string(),
        Name: z.string().optional(),
        attributes: z
            .object({
                type: z.string(),
                url: z.string()
            })
            .optional()
    })
    .passthrough();

// Output schema for normalized recent items
const OutputSchema = z.object({
    id: z.string().describe('Record ID'),
    name: z.string().optional().describe('Record name'),
    type: z.string().optional().describe('SObject type (e.g., Account, Contact)'),
    url: z.string().optional().describe('URL to the record')
});

const ListOutputSchema = z.object({
    items: z.array(OutputSchema),
    count: z.number().describe('Number of items returned')
});

const action = createAction({
    description: 'List recently viewed records visible to the authenticated user',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_recent.htm
        const response = await nango.get({
            endpoint: '/services/data/v60.0/recent',
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const providerItems = z.array(ProviderRecentItemSchema).parse(response.data);

        const items = providerItems.map((item) => {
            const type = item.attributes?.type;
            const url = item.attributes?.url;

            return {
                id: item.Id,
                ...(item.Name !== undefined && { name: item.Name }),
                ...(type !== undefined && { type }),
                ...(url !== undefined && { url })
            };
        });

        return {
            items,
            count: items.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
