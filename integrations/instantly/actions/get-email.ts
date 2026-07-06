import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Email ID. Example: "019f1a8f-9da9-70c2-b20b-440cffc77ef6"')
});

const EmailBodySchema = z
    .object({
        html: z.string().optional()
    })
    .passthrough();

const EmailSchema = z
    .object({
        id: z.string(),
        timestamp_created: z.string().optional(),
        timestamp_email: z.string().optional(),
        message_id: z.string().optional(),
        subject: z.string().optional(),
        to_address_email_list: z.string().optional(),
        body: EmailBodySchema.optional(),
        organization_id: z.string().optional(),
        eaccount: z.string().optional(),
        from_address_email: z.string().optional(),
        campaign_id: z.string().optional(),
        lead: z.string().optional(),
        lead_id: z.string().optional(),
        ue_type: z.number().optional(),
        step: z.string().optional(),
        is_unread: z.number().optional(),
        is_focused: z.number().optional(),
        thread_id: z.string().optional()
    })
    .passthrough();

const OutputSchema = EmailSchema;

const action = createAction({
    description: 'Retrieve an email.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    endpoint: {
        path: '/actions/get-email',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/groups/email
            endpoint: `/v2/emails/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const email = EmailSchema.parse(response.data);

        return email;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
