import { createAction } from 'nango';
import * as z from 'zod';

// Provider docs: https://airtable.com/developers/web/api/list-records
// GET /v0/{baseId}/{tableIdOrName}

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base'),
    tableIdOrName: z.string().describe('The ID or name of the table'),
    view: z.string().optional().describe('The name or ID of a view in the table'),
    filterByFormula: z.string().optional().describe('A formula used to filter records'),
    fields: z.array(z.string()).optional().describe('Array of field names to return'),
    sort: z
        .array(
            z.object({
                field: z.string(),
                direction: z.enum(['asc', 'desc']).optional()
            })
        )
        .optional()
        .describe('Sort order for records'),
    pageSize: z.number().int().min(1).max(100).optional().describe('Number of records per page (1-100)'),
    maxRecords: z.number().int().optional().describe('Maximum number of records to return'),
    cellFormat: z.enum(['json', 'string']).optional().describe('Format for cell values'),
    timeZone: z.string().optional().describe('Time zone for date formatting'),
    userLocale: z.string().optional().describe('User locale for formatting'),
    returnFieldsByFieldId: z.boolean().optional().describe('Return field IDs instead of names'),
    recordMetadata: z
        .array(z.enum(['commentCount']))
        .optional()
        .describe('Additional metadata to include'),
    offset: z.string().optional().describe('Pagination offset from previous response')
});

const RecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown()),
    commentCount: z.number().optional()
});

const OutputSchema = z.object({
    records: z.array(RecordSchema),
    offset: z.string().optional().describe('Offset for fetching next page'),
    hasMore: z.boolean().describe('Whether there are more records to fetch')
});

const ProviderResponseSchema = z.object({
    records: z.array(
        z.object({
            id: z.string(),
            createdTime: z.string(),
            fields: z.record(z.string(), z.unknown()),
            commentCount: z.number().optional()
        })
    ),
    offset: z.string().optional()
});

const action = createAction({
    description: 'List Airtable records from a table with view, filter, and pagination options',
    version: '1.0.0',
    endpoint: {
        path: '/actions/list-records',
        method: 'POST'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:read'],

    exec: async (nango, input) => {
        const params: Record<string, string | number> = {};

        if (input.view) {
            params['view'] = input.view;
        }
        if (input.filterByFormula) {
            params['filterByFormula'] = input.filterByFormula;
        }
        if (input.pageSize) {
            params['pageSize'] = input.pageSize;
        }
        if (input.maxRecords) {
            params['maxRecords'] = input.maxRecords;
        }
        if (input.cellFormat) {
            params['cellFormat'] = input.cellFormat;
        }
        if (input.timeZone) {
            params['timeZone'] = input.timeZone;
        }
        if (input.userLocale) {
            params['userLocale'] = input.userLocale;
        }
        if (input.returnFieldsByFieldId !== undefined) {
            params['returnFieldsByFieldId'] = String(input.returnFieldsByFieldId);
        }
        if (input.offset) {
            params['offset'] = input.offset;
        }

        if (input.fields && input.fields.length > 0) {
            for (const field of input.fields) {
                params['fields[]'] = field;
            }
        }

        if (input.sort && input.sort.length > 0) {
            for (let i = 0; i < input.sort.length; i++) {
                const sortItem = input.sort[i];
                if (sortItem) {
                    params[`sort[${i}][field]`] = sortItem.field;
                    if (sortItem.direction) {
                        params[`sort[${i}][direction]`] = sortItem.direction;
                    }
                }
            }
        }

        if (input.recordMetadata && input.recordMetadata.length > 0) {
            for (const metadata of input.recordMetadata) {
                params['recordMetadata[]'] = metadata;
            }
        }

        // Provider docs: https://airtable.com/developers/web/api/list-records
        const response = await nango.get({
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}`,
            params,
            retries: 3
        });

        const parsedData = ProviderResponseSchema.parse(response.data);

        const records = parsedData.records.map((record) => ({
            id: record.id,
            createdTime: record.createdTime,
            fields: record.fields,
            commentCount: record.commentCount
        }));

        return {
            records,
            offset: parsedData.offset,
            hasMore: !!parsedData.offset
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
