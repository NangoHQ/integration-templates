import { z } from 'zod';
import { createAction } from 'nango';

const CustomFieldInputSchema = z
    .object({
        id: z.string(),
        key: z.string().optional()
    })
    .passthrough();

const InputSchema = z.object({
    locationId: z.string().describe('Location ID. Example: "AYg6rIXHN1fXdXjGcYvI"'),
    email: z.string().optional().describe('Contact email. Example: "test@example.com"'),
    phone: z.string().optional().describe('Contact phone number. Example: "+1 888-888-8888"'),
    firstName: z.string().optional().describe('First name. Example: "Rosan"'),
    lastName: z.string().optional().describe('Last name. Example: "Deo"'),
    name: z.string().optional().describe('Full name. Example: "Rosan Deo"'),
    address1: z.string().optional().describe('Street address. Example: "3535 1st St N"'),
    city: z.string().optional().describe('City. Example: "Dolomite"'),
    state: z.string().optional().describe('State. Example: "AL"'),
    postalCode: z.string().optional().describe('Postal code. Example: "35061"'),
    country: z.string().optional().describe('Country code. Example: "US"'),
    companyName: z.string().optional().describe('Company name. Example: "DGS VolMAX"'),
    website: z.string().optional().describe('Website URL. Example: "https://www.tesla.com"'),
    assignedTo: z.string().optional().describe('User ID to assign the contact to. Example: "y0BeYjuRIlDwsDcOHOJo"'),
    tags: z.array(z.string()).optional().describe('Tags to associate with the contact.'),
    customFields: z.array(CustomFieldInputSchema).optional().describe('Custom fields for the contact.'),
    dnd: z.boolean().optional().describe('Do-not-disturb flag.'),
    dateOfBirth: z.string().optional().describe('Date of birth. Supported formats: YYYY-MM-DD.'),
    source: z.string().optional().describe('Source of the contact. Example: "public api"'),
    createNewIfDuplicateAllowed: z.boolean().optional().describe('If true and duplicates are allowed, always create a new contact.')
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

const ContactSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    locationId: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
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
    companyName: z.string().optional(),
    customFields: z.array(CustomFieldSchema).optional(),
    businessId: z.string().optional()
});

const ProviderResponseSchema = z.object({
    new: z.boolean(),
    contact: ContactSchema,
    traceId: z.string().optional()
});

const OutputSchema = z.object({
    new: z.boolean().describe('Whether a new contact was created (true) or an existing one was updated (false).'),
    contact: ContactSchema
});

const action = createAction({
    description: 'Create a contact in HighLevel, or update it in place if a contact with the same email/phone already exists.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contacts.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            locationId: input.locationId
        };

        if (input.email !== undefined) {
            data['email'] = input.email;
        }
        if (input.phone !== undefined) {
            data['phone'] = input.phone;
        }
        if (input.firstName !== undefined) {
            data['firstName'] = input.firstName;
        }
        if (input.lastName !== undefined) {
            data['lastName'] = input.lastName;
        }
        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.address1 !== undefined) {
            data['address1'] = input.address1;
        }
        if (input.city !== undefined) {
            data['city'] = input.city;
        }
        if (input.state !== undefined) {
            data['state'] = input.state;
        }
        if (input.postalCode !== undefined) {
            data['postalCode'] = input.postalCode;
        }
        if (input.country !== undefined) {
            data['country'] = input.country;
        }
        if (input.companyName !== undefined) {
            data['companyName'] = input.companyName;
        }
        if (input.website !== undefined) {
            data['website'] = input.website;
        }
        if (input.assignedTo !== undefined) {
            data['assignedTo'] = input.assignedTo;
        }
        if (input.tags !== undefined) {
            data['tags'] = input.tags;
        }
        if (input.customFields !== undefined) {
            data['customFields'] = input.customFields;
        }
        if (input.dnd !== undefined) {
            data['dnd'] = input.dnd;
        }
        if (input.dateOfBirth !== undefined) {
            data['dateOfBirth'] = input.dateOfBirth;
        }
        if (input.source !== undefined) {
            data['source'] = input.source;
        }
        if (input.createNewIfDuplicateAllowed !== undefined) {
            data['createNewIfDuplicateAllowed'] = input.createNewIfDuplicateAllowed;
        }

        // https://highlevel.stoplight.io/docs/integrations/044427d35144f-upsert-contact
        const response = await nango.post({
            endpoint: '/contacts/upsert',
            headers: {
                Version: '2021-07-28'
            },
            data,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            new: providerResponse.new,
            contact: providerResponse.contact
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
