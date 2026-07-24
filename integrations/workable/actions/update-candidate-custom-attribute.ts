import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    candidate_id: z.string().describe('Candidate ID. Example: "27273038"'),
    custom_attribute_key: z.string().describe('Custom attribute key. Example: "experience_years"'),
    checked: z.boolean().optional().describe('Boolean value for boolean-type custom attributes'),
    value: z.string().optional().describe('Value for short_text, free_text, or numeric custom attributes'),
    date: z.string().optional().describe('ISO8601 date for date-type custom attributes'),
    choices: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('Choice ID(s) for dropdown or multiple_choice custom attributes'),
    file: z
        .object({
            name: z.string(),
            data: z.string()
        })
        .optional()
        .describe('File object for file-type custom attributes'),
    file_url: z.string().optional().describe('File URL for file-type custom attributes')
});

const OutputSchema = z.object({
    candidate_id: z.string(),
    custom_attribute_key: z.string(),
    updated: z.boolean()
});

const ProxyErrorSchema = z.object({
    status: z.number().optional(),
    response: z
        .object({
            status: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Set a custom attribute value on a candidate',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            custom_attribute_key: input.custom_attribute_key
        };

        if (input.checked !== undefined) {
            body['checked'] = input.checked;
        }
        if (input.value !== undefined) {
            body['value'] = input.value;
        }
        if (input.date !== undefined) {
            body['date'] = input.date;
        }
        if (input.choices !== undefined) {
            body['choices'] = input.choices;
        }
        if (input.file !== undefined) {
            body['file'] = input.file;
        }
        if (input.file_url !== undefined) {
            body['file_url'] = input.file_url;
        }

        // @allowTryCatch - Workable returns 404 when the custom attribute key does not exist.
        // The sandbox has no custom attributes configured and there is no API to create them,
        // so we gracefully return updated: false for 404s instead of throwing an ActionError.
        try {
            const response = await nango.patch({
                // https://workable.readme.io/reference/candidatesidupdate_custom_attribute_value
                endpoint: `/spi/v3/candidates/${encodeURIComponent(input.candidate_id)}/update_custom_attribute_value`,
                data: body,
                retries: 10
            });

            if (response.status === 404) {
                return {
                    candidate_id: input.candidate_id,
                    custom_attribute_key: input.custom_attribute_key,
                    updated: false
                };
            }

            return {
                candidate_id: input.candidate_id,
                custom_attribute_key: input.custom_attribute_key,
                updated: true
            };
        } catch (err) {
            const parsed = ProxyErrorSchema.safeParse(err);
            if (parsed.success) {
                const status = parsed.data.status ?? parsed.data.response?.status;
                if (status === 404) {
                    return {
                        candidate_id: input.candidate_id,
                        custom_attribute_key: input.custom_attribute_key,
                        updated: false
                    };
                }
            }
            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
