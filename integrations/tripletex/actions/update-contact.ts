import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Contact ID. Example: 11966644'),
    version: z.number().optional().describe('Version for optimistic locking. Omit to update regardless.'),
    firstName: z.string().optional().describe('First name. Example: "Registry"'),
    lastName: z.string().optional().describe('Last name. Example: "Seed Contact"'),
    displayName: z.string().optional().describe('Display name.'),
    email: z.string().optional().describe('Email address. Example: "test@example.com"'),
    phoneNumberMobile: z.string().optional().describe('Mobile phone number.'),
    phoneNumberWork: z.string().optional().describe('Work phone number.'),
    customerId: z.number().optional().describe('Linked customer ID. Example: 93640703'),
    departmentId: z.number().optional().describe('Linked department ID. Example: 553503')
});

const ProviderContactSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phoneNumberMobile: z.string().nullable().optional(),
    phoneNumberWork: z.string().nullable().optional(),
    customer: z
        .object({
            id: z.number()
        })
        .nullable()
        .optional(),
    department: z
        .object({
            id: z.number()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    phoneNumberWork: z.string().optional(),
    customerId: z.number().optional(),
    departmentId: z.number().optional()
});

const action = createAction({
    description: 'Update a contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.version !== undefined) {
            body['version'] = input.version;
        }
        if (input.firstName !== undefined) {
            body['firstName'] = input.firstName;
        }
        if (input.lastName !== undefined) {
            body['lastName'] = input.lastName;
        }
        if (input.displayName !== undefined) {
            body['displayName'] = input.displayName;
        }
        if (input.email !== undefined) {
            body['email'] = input.email;
        }
        if (input.phoneNumberMobile !== undefined) {
            body['phoneNumberMobile'] = input.phoneNumberMobile;
        }
        if (input.phoneNumberWork !== undefined) {
            body['phoneNumberWork'] = input.phoneNumberWork;
        }
        if (input.customerId !== undefined) {
            body['customer'] = { id: input.customerId };
        }
        if (input.departmentId !== undefined) {
            body['department'] = { id: input.departmentId };
        }

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.put({
            endpoint: `v2/contact/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 3
        });

        const wrapper = z
            .object({
                value: ProviderContactSchema
            })
            .parse(response.data);
        const contact = wrapper.value;

        return {
            id: contact.id,
            ...(contact.version != null && { version: contact.version }),
            ...(contact.firstName != null && { firstName: contact.firstName }),
            ...(contact.lastName != null && { lastName: contact.lastName }),
            ...(contact.displayName != null && { displayName: contact.displayName }),
            ...(contact.email != null && { email: contact.email }),
            ...(contact.phoneNumberMobile != null && { phoneNumberMobile: contact.phoneNumberMobile }),
            ...(contact.phoneNumberWork != null && { phoneNumberWork: contact.phoneNumberWork }),
            ...(contact.customer != null && { customerId: contact.customer.id }),
            ...(contact.department != null && { departmentId: contact.department.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
