import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    formLinkName: z.string().describe('The internal form link name (e.g. "employee", "department", "designation").'),
    recordId: z.string().describe('The Zoho internal record ID to update.'),
    fields: z.record(z.string(), z.unknown()).describe('Changed fields to update. Keys are case-sensitive internal field names.')
});

const ProviderResponseSchema = z.object({
    response: z
        .object({
            result: z.unknown(),
            message: z.string().optional(),
            status: z.number()
        })
        .optional()
});

const OutputSchema = z.object({
    recordId: z.string(),
    success: z.boolean(),
    message: z.string().optional()
});

const action = createAction({
    description: 'Update a record in any form.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.zoho.com/people/api/update-records.html
            endpoint: `/people/api/forms/json/${encodeURIComponent(input.formLinkName)}/updateRecord`,
            params: {
                recordId: input.recordId,
                inputData: JSON.stringify(input.fields)
            },
            retries: 1
        };

        const response = await nango.post(config);
        const raw = response.data;

        if (raw == null || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response.'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(raw);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response did not match expected envelope.',
                details: parsed.error.message
            });
        }

        const envelope = parsed.data.response;
        if (envelope && envelope.status !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.message || 'Update failed.',
                status: envelope.status
            });
        }

        return {
            recordId: input.recordId,
            success: true,
            message: envelope?.message || 'Record updated successfully.'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
