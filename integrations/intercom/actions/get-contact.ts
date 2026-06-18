import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().min(1).describe('The unique identifier for the contact. Example: "5f5c4a1c7c9c4a0001f7e1a2"')
});

const ProviderContactSchema = z.object({
    type: z.string(),
    id: z.string(),
    workspace_id: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    name: z.string().nullable(),
    role: z.enum(['user', 'lead']),
    owner_id: z.number().nullable(),
    social_profiles: z
        .object({
            type: z.string(),
            data: z.array(
                z.object({
                    type: z.string(),
                    name: z.string(),
                    url: z.string()
                })
            )
        })
        .optional(),
    has_hard_bounced: z.boolean(),
    marked_email_as_spam: z.boolean(),
    unsubscribed_from_emails: z.boolean(),
    created_at: z.number(),
    updated_at: z.number(),
    signed_up_at: z.number().nullable(),
    last_seen_at: z.number().nullable(),
    last_replied_at: z.number().nullable(),
    last_contacted_at: z.number().nullable(),
    last_email_opened_at: z.number().nullable(),
    last_email_clicked_at: z.number().nullable(),
    language_override: z.string().nullable(),
    browser: z.string().nullable(),
    browser_version: z.string().nullable(),
    browser_language: z.string().nullable(),
    os: z.string().nullable(),
    location: z
        .object({
            type: z.string(),
            country: z.string().nullable(),
            city: z.string().nullable(),
            region: z.string().nullable()
        })
        .nullable(),
    android_app_name: z.string().nullable(),
    android_app_version: z.string().nullable(),
    android_device: z.string().nullable(),
    android_os_version: z.string().nullable(),
    android_sdk_version: z.string().nullable(),
    ios_app_name: z.string().nullable(),
    ios_app_version: z.string().nullable(),
    ios_device: z.string().nullable(),
    ios_os_version: z.string().nullable(),
    ios_sdk_version: z.string().nullable(),
    custom_attributes: z.record(z.string(), z.unknown()).optional(),
    tags: z
        .object({
            type: z.string(),
            data: z.array(
                z.object({
                    type: z.string(),
                    id: z.string(),
                    name: z.string()
                })
            ),
            url: z.string()
        })
        .optional(),
    notes: z
        .object({
            type: z.string(),
            data: z.array(z.unknown()),
            url: z.string()
        })
        .optional(),
    companies: z
        .object({
            type: z.string(),
            data: z.array(
                z.object({
                    type: z.string(),
                    id: z.string(),
                    name: z.string()
                })
            ),
            url: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    name: z.string().optional(),
    role: z.enum(['user', 'lead']).optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional()
});

const action = createAction({
    description: 'Retrieve a contact by ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Contacts/getContact
        const response = await nango.get({
            endpoint: `contacts/${encodeURIComponent(input.id)}`,
            headers: {
                'Intercom-Version': '2.11'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Contact with ID ${input.id} not found`
            });
        }

        const contact = ProviderContactSchema.parse(response.data);

        return {
            id: contact.id,
            ...(contact.email != null && { email: contact.email }),
            ...(contact.name != null && { name: contact.name }),
            ...(contact.role != null && { role: contact.role }),
            ...(contact.created_at != null && { created_at: contact.created_at }),
            ...(contact.updated_at != null && { updated_at: contact.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
