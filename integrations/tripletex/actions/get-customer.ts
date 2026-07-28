import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.number().describe('Customer ID. Example: 93640703')
});

const AddressSchema = z.object({
    id: z.number().optional(),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    displayName: z.string().optional()
});

const DepartmentSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    url: z.string().optional()
});

const EmployeeSchema = z.object({
    id: z.number().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    url: z.string().optional()
});

const CurrencySchema = z.object({
    id: z.number().optional(),
    code: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional()
});

const CustomerCategorySchema = z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    number: z.number().optional(),
    url: z.string().optional()
});

const ProviderCustomerSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    name: z.string(),
    organizationNumber: z.string().optional(),
    customerNumber: z.number().optional(),
    supplierNumber: z.number().optional(),
    isSupplier: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
    isInactive: z.boolean().optional(),
    email: z.string().optional(),
    invoiceEmail: z.string().optional(),
    overdueNoticeEmail: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    description: z.string().optional(),
    language: z.string().optional(),
    displayName: z.string().optional(),
    isPrivateIndividual: z.boolean().optional(),
    singleCustomerInvoice: z.boolean().optional(),
    invoiceSendMethod: z.string().optional(),
    emailAttachmentType: z.string().optional(),
    postalAddress: AddressSchema.nullable().optional(),
    physicalAddress: AddressSchema.nullable().optional(),
    deliveryAddress: AddressSchema.nullable().optional(),
    category1: CustomerCategorySchema.nullable().optional(),
    category2: CustomerCategorySchema.nullable().optional(),
    category3: CustomerCategorySchema.nullable().optional(),
    invoicesDueIn: z.number().optional(),
    invoicesDueInType: z.string().optional(),
    currency: CurrencySchema.nullable().optional(),
    discountPercentage: z.number().optional(),
    website: z.string().optional(),
    accountManager: EmployeeSchema.nullable().optional(),
    department: DepartmentSchema.nullable().optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderCustomerSchema
});

const OutputSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    name: z.string(),
    organizationNumber: z.string().optional(),
    customerNumber: z.number().optional(),
    supplierNumber: z.number().optional(),
    isSupplier: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
    isInactive: z.boolean().optional(),
    email: z.string().optional(),
    invoiceEmail: z.string().optional(),
    overdueNoticeEmail: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    description: z.string().optional(),
    language: z.string().optional(),
    displayName: z.string().optional(),
    isPrivateIndividual: z.boolean().optional(),
    singleCustomerInvoice: z.boolean().optional(),
    invoiceSendMethod: z.string().optional(),
    emailAttachmentType: z.string().optional(),
    postalAddress: AddressSchema.optional(),
    physicalAddress: AddressSchema.optional(),
    deliveryAddress: AddressSchema.optional(),
    category1: CustomerCategorySchema.optional(),
    category2: CustomerCategorySchema.optional(),
    category3: CustomerCategorySchema.optional(),
    invoicesDueIn: z.number().optional(),
    invoicesDueInType: z.string().optional(),
    currency: CurrencySchema.optional(),
    discountPercentage: z.number().optional(),
    website: z.string().optional(),
    accountManager: EmployeeSchema.optional(),
    department: DepartmentSchema.optional()
});

function stripNullsFromCustomer(raw: z.infer<typeof ProviderCustomerSchema>): z.infer<typeof OutputSchema> {
    const result: z.infer<typeof OutputSchema> = {
        id: raw.id,
        name: raw.name
    };

    if (raw.version !== undefined) result.version = raw.version;
    if (raw.url !== undefined) result.url = raw.url;
    if (raw.organizationNumber !== undefined) result.organizationNumber = raw.organizationNumber;
    if (raw.customerNumber !== undefined) result.customerNumber = raw.customerNumber;
    if (raw.supplierNumber !== undefined) result.supplierNumber = raw.supplierNumber;
    if (raw.isSupplier !== undefined) result.isSupplier = raw.isSupplier;
    if (raw.isCustomer !== undefined) result.isCustomer = raw.isCustomer;
    if (raw.isInactive !== undefined) result.isInactive = raw.isInactive;
    if (raw.email !== undefined) result.email = raw.email;
    if (raw.invoiceEmail !== undefined) result.invoiceEmail = raw.invoiceEmail;
    if (raw.overdueNoticeEmail !== undefined) result.overdueNoticeEmail = raw.overdueNoticeEmail;
    if (raw.phoneNumber !== undefined) result.phoneNumber = raw.phoneNumber;
    if (raw.phoneNumberMobile !== undefined) result.phoneNumberMobile = raw.phoneNumberMobile;
    if (raw.description !== undefined) result.description = raw.description;
    if (raw.language !== undefined) result.language = raw.language;
    if (raw.displayName !== undefined) result.displayName = raw.displayName;
    if (raw.isPrivateIndividual !== undefined) result.isPrivateIndividual = raw.isPrivateIndividual;
    if (raw.singleCustomerInvoice !== undefined) result.singleCustomerInvoice = raw.singleCustomerInvoice;
    if (raw.invoiceSendMethod !== undefined) result.invoiceSendMethod = raw.invoiceSendMethod;
    if (raw.emailAttachmentType !== undefined) result.emailAttachmentType = raw.emailAttachmentType;
    if (raw.postalAddress != null) result.postalAddress = raw.postalAddress;
    if (raw.physicalAddress != null) result.physicalAddress = raw.physicalAddress;
    if (raw.deliveryAddress != null) result.deliveryAddress = raw.deliveryAddress;
    if (raw.category1 != null) result.category1 = raw.category1;
    if (raw.category2 != null) result.category2 = raw.category2;
    if (raw.category3 != null) result.category3 = raw.category3;
    if (raw.invoicesDueIn !== undefined) result.invoicesDueIn = raw.invoicesDueIn;
    if (raw.invoicesDueInType !== undefined) result.invoicesDueInType = raw.invoicesDueInType;
    if (raw.currency != null) result.currency = raw.currency;
    if (raw.discountPercentage !== undefined) result.discountPercentage = raw.discountPercentage;
    if (raw.website !== undefined) result.website = raw.website;
    if (raw.accountManager != null) result.accountManager = raw.accountManager;
    if (raw.department != null) result.department = raw.department;

    return result;
}

const action = createAction({
    description: 'Retrieve a customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: `v2/customer/${encodeURIComponent(input.customerId)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Tripletex API',
                issues: parsed.error.issues
            });
        }

        return stripNullsFromCustomer(parsed.data.value);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
