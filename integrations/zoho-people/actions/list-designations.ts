import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderDesignationFieldSchema = z.object({
    Designation: z.string().optional(),
    ZP_Designation_Code: z.string().optional(),
    MailAlias: z.string().optional()
});

const ProviderDesignationRecordSchema = z.record(z.string(), z.array(ProviderDesignationFieldSchema));

const ProviderResponseSchema = z.object({
    response: z
        .object({
            result: z.array(ProviderDesignationRecordSchema).optional(),
            message: z.string().optional(),
            status: z.number().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    designation: z.string().optional(),
    code: z.string().optional(),
    mail_alias: z.string().optional()
});

const ListOutputSchema = z.object({
    items: z.array(OutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List all designations (job titles).',
    version: '1.0.1',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['ZohoPeople.forms.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const limit = 200;
        const sIndex = input.cursor ? parseInt(input.cursor, 10) : 1;

        if (Number.isNaN(sIndex)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid cursor value. Must be a numeric string.'
            });
        }

        // https://www.zoho.com/people/api/forms-api.html
        const response = await nango.get({
            endpoint: '/people/api/forms/designation/getRecords',
            params: {
                sIndex: String(sIndex),
                limit: String(limit)
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho People API',
                details: parsed.error.message
            });
        }

        const providerData = parsed.data;

        if (!providerData.response) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned a response with no envelope.'
            });
        }

        const status = providerData.response.status;

        if (status === 1) {
            throw new nango.ActionError({
                type: 'api_error',
                message: providerData.response.message || 'Zoho People API returned an error'
            });
        }

        const result = providerData.response.result;
        if (!result || result.length === 0) {
            return {
                items: [],
                next_cursor: undefined
            };
        }

        const items: z.infer<typeof OutputSchema>[] = [];

        for (const record of result) {
            const entries = Object.entries(record);
            for (const [recordId, fields] of entries) {
                const field = fields[0];
                if (!field) {
                    continue;
                }
                items.push({
                    id: recordId,
                    ...(field.Designation !== undefined && { designation: field.Designation }),
                    ...(field.ZP_Designation_Code !== undefined && { code: field.ZP_Designation_Code }),
                    ...(field.MailAlias !== undefined && { mail_alias: field.MailAlias })
                });
            }
        }

        const hasMore = result.length === limit;
        const nextCursor = hasMore ? String(sIndex + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
