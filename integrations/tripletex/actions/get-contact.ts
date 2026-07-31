import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Contact ID. Example: 11966644')
});

const ProviderContactSchema = z.object({
    id: z.number().int(),
    version: z.number().int().optional(),
    url: z.string().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phoneNumberMobile: z.string().nullable().optional(),
    phoneNumberWork: z.string().nullable().optional(),
    customer: z
        .object({
            id: z.number().int().optional()
        })
        .passthrough()
        .nullable()
        .optional(),
    department: z
        .object({
            id: z.number().int().optional()
        })
        .passthrough()
        .nullable()
        .optional(),
    isInactive: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number().int(),
    version: z.number().int().optional(),
    url: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    email: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    phoneNumberWork: z.string().optional(),
    customerId: z.number().int().optional(),
    departmentId: z.number().int().optional(),
    isInactive: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: `v2/contact/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        const wrapper = z.object({ value: ProviderContactSchema }).parse(response.data);
        const contact = wrapper.value;

        return {
            id: contact.id,
            ...(contact.version !== undefined && { version: contact.version }),
            ...(contact.url !== undefined && { url: contact.url }),
            ...(contact.firstName != null && { firstName: contact.firstName }),
            ...(contact.lastName != null && { lastName: contact.lastName }),
            ...(contact.displayName != null && { displayName: contact.displayName }),
            ...(contact.email != null && { email: contact.email }),
            ...(contact.phoneNumberMobile != null && { phoneNumberMobile: contact.phoneNumberMobile }),
            ...(contact.phoneNumberWork != null && { phoneNumberWork: contact.phoneNumberWork }),
            ...(contact.customer?.id !== undefined && { customerId: contact.customer.id }),
            ...(contact.department?.id !== undefined && { departmentId: contact.department.id }),
            ...(contact.isInactive !== undefined && { isInactive: contact.isInactive })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
