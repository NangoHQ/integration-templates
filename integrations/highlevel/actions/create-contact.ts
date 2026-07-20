import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    locationId: z.string().describe('Location ID. Example: "ve9EPM428h8vShlRW1KT"'),
    firstName: z.string().nullable().optional().describe('First name'),
    lastName: z.string().nullable().optional().describe('Last name'),
    name: z.string().nullable().optional().describe('Full name'),
    email: z.string().nullable().optional().describe('Email address'),
    phone: z.string().nullable().optional().describe('Phone number'),
    address1: z.string().nullable().optional().describe('Address line 1'),
    city: z.string().nullable().optional().describe('City'),
    state: z.string().nullable().optional().describe('State'),
    postalCode: z.string().optional().describe('Postal code'),
    website: z.string().nullable().optional().describe('Website URL'),
    timezone: z.string().nullable().optional().describe('Timezone'),
    dnd: z.boolean().optional().describe('Do not disturb flag'),
    tags: z.array(z.string()).optional().describe('Tags to assign to the contact'),
    source: z.string().optional().describe('Source of the contact'),
    country: z.string().optional().describe('Country code'),
    companyName: z.string().nullable().optional().describe('Company name'),
    assignedTo: z.string().optional().describe('User ID to assign the contact to'),
    dateOfBirth: z.string().nullable().optional().describe('Date of birth'),
    gender: z.string().optional().describe('Gender')
});

const ProviderContactSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    locationId: z.string().optional(),
    tags: z.array(z.string()).optional(),
    customFields: z.array(z.unknown()).optional(),
    address1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    companyName: z.string().optional(),
    website: z.string().optional(),
    timezone: z.string().optional(),
    source: z.string().optional(),
    assignedTo: z.string().optional(),
    dnd: z.boolean().optional(),
    dateOfBirth: z.string().optional(),
    dateAdded: z.string().optional(),
    dateUpdated: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    locationId: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    tags: z.array(z.string()).optional(),
    address1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    companyName: z.string().optional(),
    website: z.string().optional(),
    timezone: z.string().optional(),
    source: z.string().optional(),
    assignedTo: z.string().optional(),
    dnd: z.boolean().optional(),
    dateOfBirth: z.string().optional(),
    dateAdded: z.string().optional(),
    dateUpdated: z.string().optional()
});

const action = createAction({
    description: 'Create a contact in HighLevel.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://marketplace.gohighlevel.com/docs/2021-07-28/ghl/contacts/create-contact/index.html
            endpoint: '/contacts/',
            data: {
                locationId: input.locationId,
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
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.source !== undefined && { source: input.source }),
                ...(input.country !== undefined && { country: input.country }),
                ...(input.companyName !== undefined && { companyName: input.companyName }),
                ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
                ...(input.dateOfBirth !== undefined && { dateOfBirth: input.dateOfBirth }),
                ...(input.gender !== undefined && { gender: input.gender })
            },
            headers: {
                Version: '2021-07-28'
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                contact: ProviderContactSchema
            })
            .parse(response.data);

        const contact = providerResponse.contact;

        return {
            id: contact.id,
            ...(contact.locationId !== undefined && { locationId: contact.locationId }),
            ...(contact.firstName !== undefined && { firstName: contact.firstName }),
            ...(contact.lastName !== undefined && { lastName: contact.lastName }),
            ...(contact.email !== undefined && { email: contact.email }),
            ...(contact.phone !== undefined && { phone: contact.phone }),
            ...(contact.tags !== undefined && { tags: contact.tags }),
            ...(contact.address1 !== undefined && { address1: contact.address1 }),
            ...(contact.city !== undefined && { city: contact.city }),
            ...(contact.state !== undefined && { state: contact.state }),
            ...(contact.postalCode !== undefined && { postalCode: contact.postalCode }),
            ...(contact.country !== undefined && { country: contact.country }),
            ...(contact.companyName !== undefined && { companyName: contact.companyName }),
            ...(contact.website !== undefined && { website: contact.website }),
            ...(contact.timezone !== undefined && { timezone: contact.timezone }),
            ...(contact.source !== undefined && { source: contact.source }),
            ...(contact.assignedTo !== undefined && { assignedTo: contact.assignedTo }),
            ...(contact.dnd !== undefined && { dnd: contact.dnd }),
            ...(contact.dateOfBirth !== undefined && { dateOfBirth: contact.dateOfBirth }),
            ...(contact.dateAdded !== undefined && { dateAdded: contact.dateAdded }),
            ...(contact.dateUpdated !== undefined && { dateUpdated: contact.dateUpdated })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
