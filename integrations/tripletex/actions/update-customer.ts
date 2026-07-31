import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Customer ID. Example: 93640703'),
    version: z.number().optional().describe('Customer version for optimistic locking. If omitted, the current version is fetched first.'),
    name: z.string().optional().describe('Customer name.'),
    email: z.string().optional().describe('Primary email address.'),
    invoiceEmail: z.string().optional().describe('Invoice email address.'),
    overdueNoticeEmail: z.string().optional().describe('Overdue notice email address.'),
    phoneNumber: z.string().optional().describe('Phone number.'),
    phoneNumberMobile: z.string().optional().describe('Mobile phone number.'),
    organizationNumber: z.string().optional().describe('Organization number.'),
    description: z.string().optional().describe('Description.'),
    website: z.string().optional().describe('Website URL.'),
    language: z.enum(['NO', 'EN']).optional().describe('Language.'),
    isInactive: z.boolean().optional().describe('Whether the customer is inactive.'),
    isPrivateIndividual: z.boolean().optional().describe('Whether the customer is a private individual.'),
    singleCustomerInvoice: z.boolean().optional().describe('Enable various orders on one customer invoice.'),
    invoiceSendMethod: z.enum(['EMAIL', 'EHF', 'EFAKTURA', 'AVTALEGIRO', 'VIPPS', 'PAPER', 'MANUAL']).optional().describe('Invoice send method.'),
    emailAttachmentType: z.enum(['LINK', 'ATTACHMENT']).optional().describe('Email attachment type for invoices.'),
    discountPercentage: z.number().optional().describe('Default discount percentage.')
});

const ProviderEmployeeSchema = z
    .object({
        id: z.number().optional(),
        url: z.string().optional()
    })
    .passthrough();

const ProviderDepartmentSchema = z
    .object({
        id: z.number().optional(),
        url: z.string().optional()
    })
    .passthrough();

const ProviderCurrencySchema = z
    .object({
        id: z.number().optional(),
        url: z.string().optional()
    })
    .passthrough();

const ProviderAccountSchema = z
    .object({
        id: z.number().optional(),
        url: z.string().optional()
    })
    .passthrough();

const ProviderAddressSchema = z
    .object({
        id: z.number().optional(),
        addressLine1: z.string().optional().nullable(),
        addressLine2: z.string().optional().nullable(),
        postalCode: z.string().optional().nullable(),
        city: z.string().optional().nullable()
    })
    .passthrough();

const ProviderDeliveryAddressSchema = z
    .object({
        id: z.number().optional(),
        addressLine1: z.string().optional().nullable(),
        addressLine2: z.string().optional().nullable(),
        postalCode: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        name: z.string().optional().nullable()
    })
    .passthrough();

const ProviderCustomerCategorySchema = z
    .object({
        id: z.number().optional(),
        url: z.string().optional()
    })
    .passthrough();

const ProviderCustomerSchema = z
    .object({
        id: z.number(),
        version: z.number(),
        url: z.string().optional(),
        name: z.string(),
        organizationNumber: z.string().optional().nullable(),
        globalLocationNumber: z.number().optional().nullable(),
        supplierNumber: z.number().optional().nullable(),
        customerNumber: z.number().optional().nullable(),
        isSupplier: z.boolean().optional().nullable(),
        isCustomer: z.boolean().optional().nullable(),
        isInactive: z.boolean().optional().nullable(),
        accountManager: ProviderEmployeeSchema.optional().nullable(),
        department: ProviderDepartmentSchema.optional().nullable(),
        email: z.string().optional().nullable(),
        invoiceEmail: z.string().optional().nullable(),
        overdueNoticeEmail: z.string().optional().nullable(),
        phoneNumber: z.string().optional().nullable(),
        phoneNumberMobile: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        language: z.string().optional().nullable(),
        displayName: z.string().optional().nullable(),
        isPrivateIndividual: z.boolean().optional().nullable(),
        singleCustomerInvoice: z.boolean().optional().nullable(),
        invoiceSendMethod: z.string().optional().nullable(),
        emailAttachmentType: z.string().optional().nullable(),
        postalAddress: ProviderAddressSchema.optional().nullable(),
        physicalAddress: ProviderAddressSchema.optional().nullable(),
        deliveryAddress: ProviderDeliveryAddressSchema.optional().nullable(),
        category1: ProviderCustomerCategorySchema.optional().nullable(),
        category2: ProviderCustomerCategorySchema.optional().nullable(),
        category3: ProviderCustomerCategorySchema.optional().nullable(),
        invoicesDueIn: z.number().optional().nullable(),
        invoicesDueInType: z.string().optional().nullable(),
        currency: ProviderCurrencySchema.optional().nullable(),
        ledgerAccount: ProviderAccountSchema.optional().nullable(),
        isFactoring: z.boolean().optional().nullable(),
        invoiceSendSMSNotification: z.boolean().optional().nullable(),
        invoiceSMSNotificationNumber: z.string().optional().nullable(),
        isAutomaticSoftReminderEnabled: z.boolean().optional().nullable(),
        isAutomaticReminderEnabled: z.boolean().optional().nullable(),
        isAutomaticNoticeOfDebtCollectionEnabled: z.boolean().optional().nullable(),
        discountPercentage: z.number().optional().nullable(),
        website: z.string().optional().nullable()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    value: ProviderCustomerSchema
});

const OutputSchema = z.object({
    id: z.number(),
    version: z.number(),
    name: z.string(),
    email: z.string().optional(),
    invoiceEmail: z.string().optional(),
    overdueNoticeEmail: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    organizationNumber: z.string().optional(),
    description: z.string().optional(),
    website: z.string().optional(),
    language: z.string().optional(),
    isInactive: z.boolean().optional(),
    isPrivateIndividual: z.boolean().optional(),
    singleCustomerInvoice: z.boolean().optional(),
    invoiceSendMethod: z.string().optional(),
    emailAttachmentType: z.string().optional(),
    discountPercentage: z.number().optional(),
    customerNumber: z.number().optional(),
    supplierNumber: z.number().optional(),
    isSupplier: z.boolean().optional()
});

const action = createAction({
    description: 'Update a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let version = input.version;

        if (version === undefined) {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            const getResponse = await nango.get({
                endpoint: `v2/customer/${encodeURIComponent(input.id)}`,
                retries: 3
            });

            const getData = ProviderResponseSchema.parse(getResponse.data);
            version = getData.value.version;
        }

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.put({
            endpoint: `v2/customer/${encodeURIComponent(input.id)}`,
            data: {
                id: input.id,
                version,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.invoiceEmail !== undefined && { invoiceEmail: input.invoiceEmail }),
                ...(input.overdueNoticeEmail !== undefined && { overdueNoticeEmail: input.overdueNoticeEmail }),
                ...(input.phoneNumber !== undefined && { phoneNumber: input.phoneNumber }),
                ...(input.phoneNumberMobile !== undefined && { phoneNumberMobile: input.phoneNumberMobile }),
                ...(input.organizationNumber !== undefined && { organizationNumber: input.organizationNumber }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.website !== undefined && { website: input.website }),
                ...(input.language !== undefined && { language: input.language }),
                ...(input.isInactive !== undefined && { isInactive: input.isInactive }),
                ...(input.isPrivateIndividual !== undefined && { isPrivateIndividual: input.isPrivateIndividual }),
                ...(input.singleCustomerInvoice !== undefined && { singleCustomerInvoice: input.singleCustomerInvoice }),
                ...(input.invoiceSendMethod !== undefined && { invoiceSendMethod: input.invoiceSendMethod }),
                ...(input.emailAttachmentType !== undefined && { emailAttachmentType: input.emailAttachmentType }),
                ...(input.discountPercentage !== undefined && { discountPercentage: input.discountPercentage })
            },
            retries: 3
        });

        const responseData = ProviderResponseSchema.parse(response.data);
        const customer = responseData.value;

        return {
            id: customer.id,
            version: customer.version,
            name: customer.name,
            ...(customer.email != null && { email: customer.email }),
            ...(customer.invoiceEmail != null && { invoiceEmail: customer.invoiceEmail }),
            ...(customer.overdueNoticeEmail != null && { overdueNoticeEmail: customer.overdueNoticeEmail }),
            ...(customer.phoneNumber != null && { phoneNumber: customer.phoneNumber }),
            ...(customer.phoneNumberMobile != null && { phoneNumberMobile: customer.phoneNumberMobile }),
            ...(customer.organizationNumber != null && { organizationNumber: customer.organizationNumber }),
            ...(customer.description != null && { description: customer.description }),
            ...(customer.website != null && { website: customer.website }),
            ...(customer.language != null && { language: customer.language }),
            ...(customer.isInactive != null && { isInactive: customer.isInactive }),
            ...(customer.isPrivateIndividual != null && { isPrivateIndividual: customer.isPrivateIndividual }),
            ...(customer.singleCustomerInvoice != null && { singleCustomerInvoice: customer.singleCustomerInvoice }),
            ...(customer.invoiceSendMethod != null && { invoiceSendMethod: customer.invoiceSendMethod }),
            ...(customer.emailAttachmentType != null && { emailAttachmentType: customer.emailAttachmentType }),
            ...(customer.discountPercentage != null && { discountPercentage: customer.discountPercentage }),
            ...(customer.customerNumber != null && { customerNumber: customer.customerNumber }),
            ...(customer.supplierNumber != null && { supplierNumber: customer.supplierNumber }),
            ...(customer.isSupplier != null && { isSupplier: customer.isSupplier })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
