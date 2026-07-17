import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "jKy701hlSIPdiw0x12WA"')
});

const DndSettingSchema = z.object({
    status: z.string(),
    message: z.string().optional(),
    code: z.string().optional()
});

const DndSettingsSchema = z.object({
    Call: DndSettingSchema.optional(),
    Email: DndSettingSchema.optional(),
    SMS: DndSettingSchema.optional(),
    WhatsApp: DndSettingSchema.optional(),
    GMB: DndSettingSchema.optional(),
    FB: DndSettingSchema.optional()
});

const CustomFieldSchema = z.object({
    id: z.string(),
    value: z.string().optional()
});

const AttributionSourceSchema = z.object({
    url: z.string(),
    campaign: z.string().nullable().optional(),
    utmSource: z.string().nullable().optional(),
    utmMedium: z.string().nullable().optional(),
    utmContent: z.string().nullable().optional(),
    referrer: z.string().nullable().optional(),
    campaignId: z.string().nullable().optional(),
    fbclid: z.string().nullable().optional(),
    gclid: z.string().nullable().optional(),
    msclikid: z.string().nullable().optional(),
    dclid: z.string().nullable().optional(),
    fbc: z.string().nullable().optional(),
    fbp: z.string().nullable().optional(),
    fbEventId: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
    ip: z.string().nullable().optional(),
    medium: z.string().nullable().optional(),
    mediumId: z.string().nullable().optional()
});

const ProviderContactSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    locationId: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    emailLowerCase: z.string().optional(),
    timezone: z.string().optional(),
    companyName: z.string().optional(),
    phone: z.string().optional(),
    dnd: z.boolean().optional(),
    dndSettings: DndSettingsSchema.optional(),
    type: z.string().optional(),
    source: z.string().optional(),
    assignedTo: z.string().optional(),
    address1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
    website: z.string().optional(),
    tags: z.array(z.string()).optional(),
    dateOfBirth: z.string().optional(),
    dateAdded: z.string().optional(),
    dateUpdated: z.string().optional(),
    attachments: z.string().optional(),
    ssn: z.string().optional(),
    keyword: z.string().optional(),
    firstNameLowerCase: z.string().optional(),
    fullNameLowerCase: z.string().optional(),
    lastNameLowerCase: z.string().optional(),
    lastActivity: z.string().optional(),
    customFields: z.array(CustomFieldSchema).optional(),
    businessId: z.string().optional(),
    attributionSource: AttributionSourceSchema.optional(),
    lastAttributionSource: AttributionSourceSchema.optional(),
    visitorId: z.string().optional()
});

const OutputSchema = ProviderContactSchema;

const action = createAction({
    description: 'Retrieve a single contact from HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://highlevel.stoplight.io/docs/integrations/8449866a557eb-get-contact
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}`,
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        };
        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                contactId: input.contactId
            });
        }

        const providerResponse = z
            .object({
                contact: ProviderContactSchema
            })
            .parse(response.data);

        return providerResponse.contact;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
