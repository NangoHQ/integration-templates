import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        firstName: z.string().optional().describe('Contact first name. Example: "John"'),
        lastName: z.string().optional().describe('Contact last name. Example: "Doe"'),
        email: z.string().optional().describe('Contact email address. Example: "john.doe@example.com"'),
        customerId: z.number().describe('Customer ID to link the contact to. Example: 93640703'),
        departmentId: z.number().optional().describe('Department ID to assign the contact to. Example: 553503'),
        phoneNumberMobile: z.string().optional().describe('Mobile phone number. Example: "+47 123 45 678"'),
        phoneNumberWork: z.string().optional().describe('Work phone number. Example: "+47 987 65 432"'),
        displayName: z.string().optional().describe('Display name for the contact. Example: "John Doe"')
    })
    .refine((data) => data.firstName !== undefined || data.lastName !== undefined || data.email !== undefined, {
        message: 'At least one of firstName, lastName, or email is required.'
    });

const ProviderContactSchema = z.object({
    id: z.number(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    customer: z
        .object({
            id: z.number()
        })
        .passthrough()
        .optional()
        .nullable(),
    department: z
        .object({
            id: z.number()
        })
        .passthrough()
        .optional()
        .nullable(),
    phoneNumberMobile: z.string().optional().nullable(),
    phoneNumberWork: z.string().optional().nullable(),
    displayName: z.string().optional().nullable(),
    isInactive: z.boolean().optional().nullable()
});

const ProviderResponseSchema = z.object({
    value: ProviderContactSchema
});

const OutputSchema = z.object({
    id: z.number(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    customerId: z.number(),
    departmentId: z.number().optional(),
    phoneNumberMobile: z.string().optional(),
    phoneNumberWork: z.string().optional(),
    displayName: z.string().optional(),
    isInactive: z.boolean().optional()
});

const action = createAction({
    description: 'Create a contact, typically linked to a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact:write'],

    exec: async (nango, input) => {
        const payload: {
            customer: { id: number };
            firstName?: string;
            lastName?: string;
            email?: string;
            department?: { id: number };
            phoneNumberMobile?: string;
            phoneNumberWork?: string;
            displayName?: string;
        } = {
            customer: { id: input.customerId }
        };

        if (input.firstName !== undefined) {
            payload.firstName = input.firstName;
        }
        if (input.lastName !== undefined) {
            payload.lastName = input.lastName;
        }
        if (input.email !== undefined) {
            payload.email = input.email;
        }
        if (input.departmentId !== undefined) {
            payload.department = { id: input.departmentId };
        }
        if (input.phoneNumberMobile !== undefined) {
            payload.phoneNumberMobile = input.phoneNumberMobile;
        }
        if (input.phoneNumberWork !== undefined) {
            payload.phoneNumberWork = input.phoneNumberWork;
        }
        if (input.displayName !== undefined) {
            payload.displayName = input.displayName;
        }

        const response = await nango.post({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/contact',
            data: payload,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const contact = providerResponse.value;

        return {
            id: contact.id,
            ...(contact.firstName != null && { firstName: contact.firstName }),
            ...(contact.lastName != null && { lastName: contact.lastName }),
            ...(contact.email != null && { email: contact.email }),
            customerId: contact.customer?.id ?? input.customerId,
            ...(contact.department != null && { departmentId: contact.department.id }),
            ...(contact.phoneNumberMobile != null && { phoneNumberMobile: contact.phoneNumberMobile }),
            ...(contact.phoneNumberWork != null && { phoneNumberWork: contact.phoneNumberWork }),
            ...(contact.displayName != null && { displayName: contact.displayName }),
            ...(contact.isInactive != null && { isInactive: contact.isInactive })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
