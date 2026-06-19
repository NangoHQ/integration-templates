import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    formLinkName: z.string().describe('The form link name to list records for. Example: "employee"'),
    sIndex: z.number().optional().describe('1-based start index for pagination. Omit for the first page.'),
    limit: z.number().optional().describe('Number of records per page. Defaults to 200.')
});

const FormRecordSchema = z.object({
    recordId: z.string().describe('Zoho internal record ID'),
    fields: z.record(z.string(), z.unknown()).describe('Record fields as key-value pairs')
});

const OutputSchema = z.object({
    records: z.array(FormRecordSchema),
    nextSIndex: z.number().optional().describe('Next start index for pagination; omit when there are no more pages.')
});

const ProviderResponseSchema = z.object({
    response: z.object({
        result: z.array(z.record(z.string(), z.array(z.record(z.string(), z.unknown())))).optional(),
        message: z.string().optional(),
        uri: z.string().optional(),
        status: z.number()
    })
});

const action = createAction({
    description: 'List records for any form by its link name.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoPeople.forms.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const sIndex = input.sIndex ?? 1;
        const limit = input.limit ?? 200;

        if (!Number.isInteger(sIndex) || sIndex < 1) {
            throw new nango.ActionError({ type: 'invalid_input', message: 'sIndex must be a positive integer.' });
        }
        if (!Number.isInteger(limit) || limit < 1) {
            throw new nango.ActionError({ type: 'invalid_input', message: 'limit must be a positive integer.' });
        }

        // https://www.zoho.com/people/api/overview.html
        const response = await nango.get({
            endpoint: `/people/api/forms/${encodeURIComponent(input.formLinkName)}/getRecords`,
            params: {
                sIndex: String(sIndex),
                limit: String(limit)
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        if (providerData.response.status !== 0) {
            const message = (providerData.response.message ?? '').toLowerCase();
            if (message.includes('no records') || message.includes('7024')) {
                return { records: [] };
            }
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerData.response.message || 'Unknown error from Zoho People',
                status: providerData.response.status
            });
        }

        const result = providerData.response.result || [];
        const records: Array<z.infer<typeof FormRecordSchema>> = [];

        for (const item of result) {
            const entries = Object.entries(item);
            if (entries.length === 0) {
                continue;
            }

            const firstEntry = entries[0];
            if (!firstEntry) {
                continue;
            }

            const [recordId, fieldArray] = firstEntry;
            if (!Array.isArray(fieldArray) || fieldArray.length === 0) {
                continue;
            }

            const fields = fieldArray[0];
            if (typeof fields !== 'object' || fields === null) {
                continue;
            }

            records.push({
                recordId,
                fields
            });
        }

        const hasMorePages = result.length >= limit;

        return {
            records,
            ...(hasMorePages && { nextSIndex: sIndex + limit })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
