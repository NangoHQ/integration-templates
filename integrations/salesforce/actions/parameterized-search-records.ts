import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('Search string (q parameter). Example: "Acme"'),
    sobjects: z.array(z.string()).describe('Array of sObject types to search across. Example: ["Account", "Contact"]'),
    fields: z.array(z.string()).optional().describe('Fields to return for each sObject. Example: ["Id", "Name", "Email"]'),
    limit: z.number().int().min(1).max(2000).optional().describe('Maximum number of results to return (1-2000).'),
    offset: z.number().int().min(0).optional().describe('Number of records to skip for pagination.'),
    orderBy: z.string().optional().describe('Field to order results by.'),
    where: z.string().optional().describe('Additional WHERE clause to filter results.')
});

const SearchResultSchema = z
    .object({
        attributes: z.object({
            type: z.string(),
            url: z.string()
        }),
        Id: z.string()
    })
    .passthrough();

const SearchRecordGroupSchema = z.object({
    attributes: z.object({
        type: z.string()
    }),
    searchRecords: z.array(z.unknown())
});

const ProviderResponseSchema = z.object({
    searchRecords: z.array(z.unknown()).optional()
});

const SearchItemSchema = z.object({
    sobjectType: z.string(),
    id: z.string(),
    fields: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    results: z.array(SearchItemSchema)
});

type ParamsType = {
    q: string;
    sObject?: string | string[];
    fields?: string | string[];
    limit?: number;
    offset?: number;
    orderBy?: string;
    where?: string;
};

const action = createAction({
    description: 'Run a parameterized search request across Salesforce objects.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/parameterized-search-records',
        group: 'Search'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api', 'refresh_token'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build params with arrays for repeated query parameters
        const params: ParamsType = {
            q: input.query
        };

        // Salesforce expects repeated sObject params like: sObject=Account&sObject=Contact
        if (input.sobjects.length === 1) {
            const firstSobject = input.sobjects[0];
            if (firstSobject) {
                params.sObject = firstSobject;
            }
        } else if (input.sobjects.length > 1) {
            params.sObject = input.sobjects;
        }

        // Salesforce expects repeated fields params like: fields=Id&fields=Name
        if (input.fields && input.fields.length > 0) {
            if (input.fields.length === 1) {
                const firstField = input.fields[0];
                if (firstField) {
                    params.fields = firstField;
                }
            } else {
                params.fields = input.fields;
            }
        }

        if (input.limit !== undefined) {
            params.limit = input.limit;
        }
        if (input.offset !== undefined) {
            params.offset = input.offset;
        }
        if (input.orderBy) {
            params.orderBy = input.orderBy;
        }
        if (input.where) {
            params.where = input.where;
        }

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_parameterized_search.htm
        const response = await nango.get({
            endpoint: '/services/data/v59.0/parameterizedSearch',
            params,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const results: z.infer<typeof SearchItemSchema>[] = [];
        const searchRecords = providerData.searchRecords || [];

        for (const record of searchRecords) {
            const parsedGroup = SearchRecordGroupSchema.safeParse(record);
            if (parsedGroup.success) {
                const sobjectType = parsedGroup.data.attributes.type;
                for (const searchRecord of parsedGroup.data.searchRecords) {
                    const parsedRecord = SearchResultSchema.safeParse(searchRecord);
                    if (parsedRecord.success) {
                        const { attributes: _attributes, Id, ...fields } = parsedRecord.data;
                        results.push({
                            sobjectType,
                            id: Id,
                            fields
                        });
                    }
                }
            }
        }

        return {
            results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
