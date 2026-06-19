import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderDepartmentFieldSchema = z
    .object({
        Department: z.string().optional(),
        Department_Lead: z.string().optional(),
        Parent_Department: z.string().optional(),
        ZP_Department_Code: z.string().optional(),
        MailAlias: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    response: z.object({
        result: z.array(z.record(z.string(), z.array(ProviderDepartmentFieldSchema))).optional(),
        message: z.string().optional(),
        status: z.number()
    })
});

const DepartmentSchema = z.object({
    id: z.string().describe('Zoho record ID'),
    Department: z.string().optional().describe('Department name'),
    Department_Lead: z.string().optional().describe('Department lead'),
    Parent_Department: z.string().optional().describe('Parent department'),
    ZP_Department_Code: z.string().optional().describe('Department code'),
    MailAlias: z.string().optional().describe('Mail alias')
});

const OutputSchema = z.object({
    items: z.array(DepartmentSchema),
    next_cursor: z.string().optional().describe('Cursor for the next page')
});

const action = createAction({
    description: 'List all departments',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = 200;
        const sIndex = input.cursor ? parseInt(input.cursor, 10) : 1;

        if (input.cursor && isNaN(sIndex)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid cursor format'
            });
        }

        // https://www.zoho.com/people/api/overview.html
        const response = await nango.get({
            endpoint: '/people/api/forms/department/getRecords',
            params: {
                sIndex: String(sIndex),
                limit: String(limit)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.response.status !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.response.message || 'Unknown error',
                status: providerResponse.response.status
            });
        }

        const rawResult = providerResponse.response.result || [];
        const items = [];
        for (const record of rawResult) {
            const entries = Object.entries(record);
            const firstEntry = entries[0];
            if (!firstEntry) {
                continue;
            }
            const [recordId, fieldArrays] = firstEntry;
            if (!Array.isArray(fieldArrays) || fieldArrays.length === 0) {
                continue;
            }
            const fields = fieldArrays[0];
            if (!fields) {
                continue;
            }
            items.push({
                id: recordId,
                ...(fields.Department !== undefined && { Department: fields.Department }),
                ...(fields.Department_Lead !== undefined && { Department_Lead: fields.Department_Lead }),
                ...(fields.Parent_Department !== undefined && { Parent_Department: fields.Parent_Department }),
                ...(fields.ZP_Department_Code !== undefined && { ZP_Department_Code: fields.ZP_Department_Code }),
                ...(fields.MailAlias !== undefined && { MailAlias: fields.MailAlias })
            });
        }

        const nextCursor = rawResult.length === limit ? String(sIndex + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
