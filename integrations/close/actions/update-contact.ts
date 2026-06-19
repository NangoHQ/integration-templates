import { z } from 'zod';
import { createAction } from 'nango';

const EmailInputSchema = z.object({
    email: z.string(),
    type: z.string().optional()
});

const PhoneInputSchema = z.object({
    phone: z.string(),
    type: z.string().optional()
});

const UrlInputSchema = z.object({
    url: z.string(),
    type: z.string().optional()
});

const InputSchema = z
    .object({
        id: z.string().describe('Contact ID. Example: "cont_xxx"'),
        name: z.string().nullable().optional().describe('Contact name'),
        title: z.string().nullable().optional().describe('Contact title'),
        emails: z.array(EmailInputSchema).nullable().optional().describe('Email addresses'),
        phones: z.array(PhoneInputSchema).nullable().optional().describe('Phone numbers'),
        urls: z.array(UrlInputSchema).nullable().optional().describe('URLs'),
        timezone: z.string().nullable().optional().describe('IANA timezone identifier')
    })
    .passthrough();

const EmailSchema = z.object({
    email: z.string(),
    type: z.string(),
    is_unsubscribed: z.boolean()
});

const PhoneSchema = z.object({
    phone: z.string(),
    type: z.string(),
    country: z.string().nullable().optional(),
    phone_formatted: z.string().optional(),
    outbound_sms_blocked: z.boolean().optional()
});

const UrlSchema = z.object({
    url: z.string(),
    type: z.string()
});

const OutputSchema = z
    .object({
        id: z.string(),
        name: z.string().nullable(),
        title: z.string().nullable(),
        display_name: z.string(),
        emails: z.array(EmailSchema).optional(),
        phones: z.array(PhoneSchema).optional(),
        urls: z.array(UrlSchema).optional(),
        lead_id: z.string().nullable().optional(),
        organization_id: z.string(),
        created_by: z.string().nullable(),
        updated_by: z.string().nullable(),
        date_created: z.string(),
        date_updated: z.string(),
        timezone: z.string().nullable().optional(),
        timezone_source: z.string().nullable().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update a contact',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { id, ...updateData } = input;

        const response = await nango.put({
            // https://developer.close.com/api/resources/contacts/update
            endpoint: `/v1/contact/${encodeURIComponent(id)}/`,
            data: updateData,
            retries: 1
        });

        const providerContact = OutputSchema.parse(response.data);
        return providerContact;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
