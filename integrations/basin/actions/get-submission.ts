import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    submission_id: z.number().describe('Submission ID. Example: 60737785')
});

const ProviderAttachmentSchema = z.object({
    id: z.number(),
    name: z.string(),
    form_name: z.string().nullable().optional(),
    created_at: z.string(),
    file_size: z.number(),
    content_type: z.string(),
    attachment_proxy_url: z.string(),
    public_url: z.string()
});

const OutputAttachmentSchema = z.object({
    id: z.number(),
    name: z.string(),
    form_name: z.string().optional(),
    created_at: z.string(),
    file_size: z.number(),
    content_type: z.string(),
    attachment_proxy_url: z.string(),
    public_url: z.string()
});

const FormSchema = z.object({
    name: z.string(),
    uuid: z.string()
});

const ProviderSubmissionSchema = z.object({
    id: z.number(),
    email: z.string().nullable().optional(),
    payload_params: z.record(z.string(), z.unknown()).optional(),
    form_id: z.number(),
    spam: z.boolean(),
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
    attachments: z.array(ProviderAttachmentSchema).optional(),
    form: FormSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    email: z.string().optional(),
    payload_params: z.record(z.string(), z.unknown()).optional(),
    form_id: z.number(),
    spam: z.boolean(),
    read: z.boolean(),
    trash: z.boolean(),
    spam_reason: z.string().optional(),
    webhook_sent_at: z.string().optional(),
    ip: z.string().optional(),
    referrer: z.string().optional(),
    user_agent: z.string().optional(),
    geocoded_country: z.string().optional(),
    geocoded_region: z.string().optional(),
    geocoded_city: z.string().optional(),
    attachments: z.array(OutputAttachmentSchema).optional(),
    form: FormSchema.optional()
});

const action = createAction({
    description: 'Get a single submission by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: `v1/submissions/${encodeURIComponent(String(input.submission_id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Submission not found',
                submission_id: input.submission_id
            });
        }

        const providerSubmission = ProviderSubmissionSchema.parse(response.data);

        return {
            id: providerSubmission.id,
            ...(providerSubmission.email != null && { email: providerSubmission.email }),
            ...(providerSubmission.payload_params != null && { payload_params: providerSubmission.payload_params }),
            form_id: providerSubmission.form_id,
            spam: providerSubmission.spam,
            read: providerSubmission.read,
            trash: providerSubmission.trash,
            ...(providerSubmission.spam_reason != null && { spam_reason: providerSubmission.spam_reason }),
            ...(providerSubmission.webhook_sent_at != null && { webhook_sent_at: providerSubmission.webhook_sent_at }),
            ...(providerSubmission.ip != null && { ip: providerSubmission.ip }),
            ...(providerSubmission.referrer != null && { referrer: providerSubmission.referrer }),
            ...(providerSubmission.user_agent != null && { user_agent: providerSubmission.user_agent }),
            ...(providerSubmission.geocoded_country != null && { geocoded_country: providerSubmission.geocoded_country }),
            ...(providerSubmission.geocoded_region != null && { geocoded_region: providerSubmission.geocoded_region }),
            ...(providerSubmission.geocoded_city != null && { geocoded_city: providerSubmission.geocoded_city }),
            ...(providerSubmission.attachments != null && {
                attachments: providerSubmission.attachments.map((attachment) => ({
                    id: attachment.id,
                    name: attachment.name,
                    ...(attachment.form_name != null && { form_name: attachment.form_name }),
                    created_at: attachment.created_at,
                    file_size: attachment.file_size,
                    content_type: attachment.content_type,
                    attachment_proxy_url: attachment.attachment_proxy_url,
                    public_url: attachment.public_url
                }))
            }),
            ...(providerSubmission.form != null && { form: providerSubmission.form })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
