import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).max(255).describe('Customer name. Example: "Acme AS"'),
    organizationNumber: z.string().max(100).optional().describe('Organization number. Example: "123456789"'),
    email: z.string().email().max(254).optional().describe('Customer email address. Example: "contact@acme.no"'),
    invoiceEmail: z.string().max(254).optional().describe('Invoice email address. Example: "invoice@acme.no"'),
    phoneNumber: z.string().max(100).optional().describe('Phone number. Example: "+47 123 45 678"'),
    phoneNumberMobile: z.string().max(100).optional().describe('Mobile phone number. Example: "+47 987 65 432"'),
    description: z.string().max(16777215).optional().describe('Customer description.'),
    isPrivateIndividual: z.boolean().optional().describe('Whether the customer is a private individual.'),
    isInactive: z.boolean().optional().describe('Whether the customer is inactive.'),
    language: z.enum(['NO', 'EN']).optional().describe('Preferred language. Example: "NO"'),
    invoiceSendMethod: z
        .enum(['EMAIL', 'EHF', 'EFAKTURA', 'AVTALEGIRO', 'VIPPS', 'PAPER', 'MANUAL'])
        .optional()
        .describe('Invoice send method. Example: "EMAIL"'),
    emailAttachmentType: z.enum(['LINK', 'ATTACHMENT']).optional().describe('Email attachment type. Example: "LINK"')
});

const ProviderCustomerSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    name: z.string(),
    organizationNumber: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    invoiceEmail: z.string().nullable().optional(),
    phoneNumber: z.string().nullable().optional(),
    phoneNumberMobile: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    isPrivateIndividual: z.boolean().nullable().optional(),
    isInactive: z.boolean().nullable().optional(),
    language: z.string().nullable().optional(),
    invoiceSendMethod: z.string().nullable().optional(),
    emailAttachmentType: z.string().nullable().optional(),
    customerNumber: z.number().nullable().optional(),
    displayName: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number().describe('Customer ID. Example: 93640703'),
    name: z.string(),
    organizationNumber: z.string().optional(),
    email: z.string().optional(),
    invoiceEmail: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    description: z.string().optional(),
    isPrivateIndividual: z.boolean().optional(),
    isInactive: z.boolean().optional(),
    language: z.string().optional(),
    invoiceSendMethod: z.string().optional(),
    emailAttachmentType: z.string().optional(),
    customerNumber: z.number().optional(),
    displayName: z.string().optional()
});

const action = createAction({
    description: 'Create a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/customer',
            data: {
                name: input.name,
                ...(input.organizationNumber !== undefined && { organizationNumber: input.organizationNumber }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.invoiceEmail !== undefined && { invoiceEmail: input.invoiceEmail }),
                ...(input.phoneNumber !== undefined && { phoneNumber: input.phoneNumber }),
                ...(input.phoneNumberMobile !== undefined && { phoneNumberMobile: input.phoneNumberMobile }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.isPrivateIndividual !== undefined && { isPrivateIndividual: input.isPrivateIndividual }),
                ...(input.isInactive !== undefined && { isInactive: input.isInactive }),
                ...(input.language !== undefined && { language: input.language }),
                ...(input.invoiceSendMethod !== undefined && { invoiceSendMethod: input.invoiceSendMethod }),
                ...(input.emailAttachmentType !== undefined && { emailAttachmentType: input.emailAttachmentType })
            },
            retries: 3
        });

        const rawValue = z.object({ value: z.unknown() }).parse(response.data).value;
        const providerCustomer = ProviderCustomerSchema.parse(rawValue);

        return {
            id: providerCustomer.id,
            name: providerCustomer.name,
            ...(providerCustomer.organizationNumber != null && { organizationNumber: providerCustomer.organizationNumber }),
            ...(providerCustomer.email != null && { email: providerCustomer.email }),
            ...(providerCustomer.invoiceEmail != null && { invoiceEmail: providerCustomer.invoiceEmail }),
            ...(providerCustomer.phoneNumber != null && { phoneNumber: providerCustomer.phoneNumber }),
            ...(providerCustomer.phoneNumberMobile != null && { phoneNumberMobile: providerCustomer.phoneNumberMobile }),
            ...(providerCustomer.description != null && { description: providerCustomer.description }),
            ...(providerCustomer.isPrivateIndividual != null && { isPrivateIndividual: providerCustomer.isPrivateIndividual }),
            ...(providerCustomer.isInactive != null && { isInactive: providerCustomer.isInactive }),
            ...(providerCustomer.language != null && { language: providerCustomer.language }),
            ...(providerCustomer.invoiceSendMethod != null && { invoiceSendMethod: providerCustomer.invoiceSendMethod }),
            ...(providerCustomer.emailAttachmentType != null && { emailAttachmentType: providerCustomer.emailAttachmentType }),
            ...(providerCustomer.customerNumber != null && { customerNumber: providerCustomer.customerNumber }),
            ...(providerCustomer.displayName != null && { displayName: providerCustomer.displayName })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
