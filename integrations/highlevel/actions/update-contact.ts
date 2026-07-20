import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const DndSettingSchema = z.object({
    status: z.enum(['active', 'inactive', 'permanent']),
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

const InboundDndSettingSchema = z.object({
    status: z.enum(['active', 'inactive']),
    message: z.string().optional()
});

const InboundDndSettingsSchema = z.object({
    all: InboundDndSettingSchema.optional()
});

const CustomFieldSchema = z.object({
    id: z.string(),
    key: z.string().optional(),
    field_value: z.unknown().optional()
});

const InputSchema = z.object({
    contactId: z.string().describe('Contact ID. Example: "ocQHyuzHvysMo5N5VsXc"'),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    address1: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    postalCode: z.string().optional(),
    website: z.string().nullable().optional(),
    timezone: z.string().nullable().optional(),
    dnd: z.boolean().optional(),
    dndSettings: DndSettingsSchema.optional(),
    inboundDndSettings: InboundDndSettingsSchema.optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.array(CustomFieldSchema).optional(),
    source: z.string().nullable().optional(),
    dateOfBirth: z.string().nullable().optional(),
    country: z.string().optional(),
    assignedTo: z.string().nullable().optional()
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
    customFields: z.array(CustomFieldSchema).optional(),
    businessId: z.string().optional()
});

const ProviderResponseSchema = z.object({
    succeded: z.boolean(),
    contact: ProviderContactSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    locationId: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    dnd: z.boolean().optional(),
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
    customFields: z.array(CustomFieldSchema).optional(),
    businessId: z.string().optional()
});

const action = createAction({
    description: 'Update a contact in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            ...(input.firstName !== undefined && { firstName: input.firstName }),
            ...(input.lastName !== undefined && { lastName: input.lastName }),
            ...(input.name !== undefined && { name: input.name }),
            ...(input.email !== undefined && { email: input.email }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.address1 !== undefined && { address1: input.address1 }),
            ...(input.city !== undefined && { city: input.city }),
            ...(input.state !== undefined && { state: input.state }),
            ...(input.postalCode !== undefined && { postalCode: input.postalCode }),
            ...(input.website !== undefined && { website: input.website }),
            ...(input.timezone !== undefined && { timezone: input.timezone }),
            ...(input.dnd !== undefined && { dnd: input.dnd }),
            ...(input.dndSettings !== undefined && { dndSettings: input.dndSettings }),
            ...(input.inboundDndSettings !== undefined && { inboundDndSettings: input.inboundDndSettings }),
            ...(input.tags !== undefined && { tags: input.tags }),
            ...(input.customFields !== undefined && { customFields: input.customFields }),
            ...(input.source !== undefined && { source: input.source }),
            ...(input.dateOfBirth !== undefined && { dateOfBirth: input.dateOfBirth }),
            ...(input.country !== undefined && { country: input.country }),
            ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo })
        };

        const config: ProxyConfiguration = {
            // https://highlevel.stoplight.io/docs/integrations/
            endpoint: `/contacts/${encodeURIComponent(input.contactId)}`,
            headers: {
                Version: '2021-07-28'
            },
            data: body,
            retries: 3
        };

        const response = await nango.put(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found or update failed',
                contactId: input.contactId
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.succeded || !providerResponse.contact) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'HighLevel reported the contact update did not succeed',
                contactId: input.contactId
            });
        }

        const contact = providerResponse.contact;

        return {
            id: contact.id,
            ...(contact.name != null && { name: contact.name }),
            ...(contact.locationId != null && { locationId: contact.locationId }),
            ...(contact.firstName != null && { firstName: contact.firstName }),
            ...(contact.lastName != null && { lastName: contact.lastName }),
            ...(contact.email != null && { email: contact.email }),
            ...(contact.phone != null && { phone: contact.phone }),
            ...(contact.dnd != null && { dnd: contact.dnd }),
            ...(contact.type != null && { type: contact.type }),
            ...(contact.source != null && { source: contact.source }),
            ...(contact.assignedTo != null && { assignedTo: contact.assignedTo }),
            ...(contact.address1 != null && { address1: contact.address1 }),
            ...(contact.city != null && { city: contact.city }),
            ...(contact.state != null && { state: contact.state }),
            ...(contact.country != null && { country: contact.country }),
            ...(contact.postalCode != null && { postalCode: contact.postalCode }),
            ...(contact.website != null && { website: contact.website }),
            ...(contact.tags != null && { tags: contact.tags }),
            ...(contact.dateOfBirth != null && { dateOfBirth: contact.dateOfBirth }),
            ...(contact.dateAdded != null && { dateAdded: contact.dateAdded }),
            ...(contact.dateUpdated != null && { dateUpdated: contact.dateUpdated }),
            ...(contact.customFields != null && { customFields: contact.customFields }),
            ...(contact.businessId != null && { businessId: contact.businessId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
