import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    submissionId: z.number().describe('Submission ID to delete. Example: 61110051')
});

const FormSchema = z.object({
    name: z.string(),
    uuid: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    email: z.string(),
    source_url: z.string().nullable().optional(),
    source_host: z.string().nullable().optional(),
    source_path: z.string().nullable().optional(),
    source_query: z.string().nullable().optional(),
    source_fragment: z.string().nullable().optional(),
    payload_params: z.record(z.string(), z.unknown()).optional(),
    form_id: z.number(),
    spam: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    read: z.boolean(),
    trash: z.boolean(),
    spam_reason: z.string().nullable().optional(),
    webhook_sent_at: z.string().nullable().optional(),
    ip: z.string().nullable().optional(),
    referrer: z.string().nullable().optional(),
    user_agent: z.string().nullable().optional(),
    geocoded_country: z.string().nullable().optional(),
    geocoded_region: z.string().nullable().optional(),
    geocoded_city: z.string().nullable().optional(),
    attachments: z.array(z.unknown()).nullable().optional(),
    form: FormSchema
});

const action = createAction({
    description: 'Permanently delete a submission.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.usebasin.com/developer-features/api-reference/
        const response = await nango.delete({
            endpoint: `v1/submissions/${encodeURIComponent(String(input.submissionId))}`,
            retries: 10
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Submission not found',
                submission_id: input.submissionId
            });
        }

        const providerSubmission = OutputSchema.parse(response.data);

        return providerSubmission;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
