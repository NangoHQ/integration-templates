import { z } from 'zod';
import { createAction } from 'nango';

const SortSchema = z.object({
    field: z.string().describe('Field name to sort by. Example: "Name"'),
    direction: z.enum(['asc', 'desc']).optional().describe('Sort direction.')
});

const InputSchema = z.object({
    baseId: z.string().describe('Airtable base ID. Example: "app123"'),
    tableIdOrName: z.string().describe('Table ID or name. Example: "TableName"'),
    view: z.string().optional().describe('View name or ID to filter records.'),
    filterByFormula: z.string().optional().describe('Airtable formula to filter records.'),
    fields: z.array(z.string()).optional().describe('List of field names to include.'),
    sort: z.array(SortSchema).optional().describe('Sort configuration.'),
    pageSize: z.number().int().min(1).max(100).optional().describe('Records per page (1-100).'),
    maxRecords: z.number().int().min(1).optional().describe('Maximum total records to return.'),
    cellFormat: z.enum(['json', 'string']).optional().describe('Cell format.'),
    offset: z.string().optional().describe('Pagination offset from previous response.')
});

const RecordSchema = z.object({
    id: z.string(),
    createdTime: z.string(),
    fields: z.record(z.string(), z.unknown())
});

const OutputSchema = z.object({
    records: z.array(RecordSchema),
    offset: z.string().optional().describe('Pagination offset for the next page.')
});

const action = createAction({
    description: 'List Airtable records from a table with view, filter, and pagination options.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-records',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.records:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[]> = {};

        if (input.view !== undefined) {
            params['view'] = input.view;
        }
        if (input.filterByFormula !== undefined) {
            params['filterByFormula'] = input.filterByFormula;
        }
        if (input.fields !== undefined && input.fields.length > 0) {
            let fieldIndex = 0;
            for (const field of input.fields) {
                params[`fields[${fieldIndex}]`] = field;
                fieldIndex++;
            }
        }
        if (input.sort !== undefined && input.sort.length > 0) {
            let sortIndex = 0;
            for (const s of input.sort) {
                params[`sort[${sortIndex}][field]`] = s.field;
                if (s.direction !== undefined) {
                    params[`sort[${sortIndex}][direction]`] = s.direction;
                }
                sortIndex++;
            }
        }
        if (input.pageSize !== undefined) {
            params['pageSize'] = input.pageSize;
        }
        if (input.maxRecords !== undefined) {
            params['maxRecords'] = input.maxRecords;
        }
        if (input.cellFormat !== undefined) {
            params['cellFormat'] = input.cellFormat;
        }
        if (input.offset !== undefined) {
            params['offset'] = input.offset;
        }

        // https://airtable.com/developers/web/api/list-records
        const response = await nango.get({
            endpoint: `/v0/${input.baseId}/${input.tableIdOrName}`,
            params,
            retries: 3
        });

        const parsed = z
            .object({
                records: z.array(z.unknown()).default([]),
                offset: z.string().optional()
            })
            .parse(response.data);

        const records = parsed.records.map((record: unknown) => {
            const parsedRecord = RecordSchema.parse(record);
            return {
                id: parsedRecord.id,
                createdTime: parsedRecord.createdTime,
                fields: parsedRecord.fields
            };
        });

        return {
            records,
            ...(parsed.offset !== undefined && { offset: parsed.offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
