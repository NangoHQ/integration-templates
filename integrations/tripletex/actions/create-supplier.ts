import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('Supplier name. Example: "Acme AS"'),
    organizationNumber: z.string().optional().describe('Organization number. Example: "123456789"'),
    email: z.string().email().optional().describe('Email address. Example: "contact@acme.no"'),
    invoiceEmail: z.string().email().optional().describe('Invoice email address. Example: "invoice@acme.no"'),
    phoneNumber: z.string().optional().describe('Phone number. Example: "+47 123 45 678"'),
    phoneNumberMobile: z.string().optional().describe('Mobile phone number. Example: "+47 987 65 432"'),
    description: z.string().optional().describe('Description. Example: "Office supplies vendor"'),
    isInactive: z.boolean().optional().describe('Whether the supplier is inactive.'),
    isCustomer: z.boolean().optional().describe('Whether the supplier is also a customer.'),
    isPrivateIndividual: z.boolean().optional().describe('Whether the supplier is a private individual.'),
    website: z.string().optional().describe('Website URL. Example: "https://acme.no"'),
    language: z.enum(['NO', 'EN']).optional().describe('Preferred language. Example: "NO"')
});

const ProviderSupplierSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    name: z.string(),
    organizationNumber: z.string().nullable().optional(),
    supplierNumber: z.number().optional(),
    customerNumber: z.number().optional(),
    isSupplier: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
    isInactive: z.boolean().optional(),
    email: z.string().nullable().optional(),
    invoiceEmail: z.string().nullable().optional(),
    overdueNoticeEmail: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    phoneNumberMobile: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    isPrivateIndividual: z.boolean().optional(),
    showProducts: z.boolean().optional(),
    language: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    website: z.string().nullable().optional()
});

const OutputSchema = ProviderSupplierSchema;

const action = createAction({
    description: 'Create a supplier.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            name: input.name
        };

        if (input.organizationNumber !== undefined) {
            body['organizationNumber'] = input.organizationNumber;
        }
        if (input.email !== undefined) {
            body['email'] = input.email;
        }
        if (input.invoiceEmail !== undefined) {
            body['invoiceEmail'] = input.invoiceEmail;
        }
        if (input.phoneNumber !== undefined) {
            body['phoneNumber'] = input.phoneNumber;
        }
        if (input.phoneNumberMobile !== undefined) {
            body['phoneNumberMobile'] = input.phoneNumberMobile;
        }
        if (input.description !== undefined) {
            body['description'] = input.description;
        }
        if (input.isInactive !== undefined) {
            body['isInactive'] = input.isInactive;
        }
        if (input.isCustomer !== undefined) {
            body['isCustomer'] = input.isCustomer;
        }
        if (input.isPrivateIndividual !== undefined) {
            body['isPrivateIndividual'] = input.isPrivateIndividual;
        }
        if (input.website !== undefined) {
            body['website'] = input.website;
        }
        if (input.language !== undefined) {
            body['language'] = input.language;
        }

        const config: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/supplier',
            data: body,
            retries: 1
        };

        const response = await nango.post(config);

        const wrapper = z
            .object({
                value: z.unknown()
            })
            .parse(response.data);

        const supplier = ProviderSupplierSchema.parse(wrapper.value);

        return supplier;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
