import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    module_api_name: z.string().describe('The API name of the module to search. Example: "Leads", "Contacts", "Accounts"'),
    criteria: z.string().optional().describe('Search criteria in the format (field_name:operation:search_value). Example: "(Last_Name:equals:Smith)"'),
    email: z.string().optional().describe('Email address to search for. Example: "john@example.com"'),
    phone: z.string().optional().describe('Phone number to search for. Example: "555-1234"'),
    word: z.string().optional().describe('Search for records containing this word across fields. Example: "Acme"'),
    offset: z.number().int().optional().describe('Offset for pagination. Example: 0'),
    per_page: z.number().int().max(200).optional().describe('Number of records per page (max 200). Example: 20')
});

const RecordSchema = z
    .object({
        id: z.string(),
        created_by: z.unknown().optional(),
        modified_by: z.unknown().optional(),
        owner: z.unknown().optional(),
        created_time: z.string().optional(),
        modified_time: z.string().optional()
    })
    .passthrough();

const InfoSchema = z.object({
    per_page: z.number().optional(),
    count: z.number().optional(),
    page: z.number().optional(),
    more_records: z.boolean().optional()
});

const OutputSchema = z.object({
    data: z.array(RecordSchema).describe('Array of matching records'),
    info: InfoSchema.optional().describe('Pagination and result metadata'),
    module_api_name: z.string().describe('The module that was searched')
});

const action = createAction({
    description: 'Search records in a Zoho CRM module using criteria, email, phone, or word filters.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/search-records',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.ALL', 'ZohoCRM.modules.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.criteria) {
            params['criteria'] = input.criteria;
        } else if (input.email) {
            params['email'] = input.email;
        } else if (input.phone) {
            params['phone'] = input.phone;
        } else if (input.word) {
            params['word'] = input.word;
        }

        if (input.offset !== undefined) {
            params['offset'] = input.offset;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: `/crm/v2/${input.module_api_name}/search`,
            params,
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object') {
            return {
                data: [],
                module_api_name: input.module_api_name
            };
        }

        const dataArray = Array.isArray(rawData.data) ? rawData.data : [];

        return {
            data: dataArray,
            ...(rawData.info !== undefined && { info: rawData.info }),
            module_api_name: input.module_api_name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
