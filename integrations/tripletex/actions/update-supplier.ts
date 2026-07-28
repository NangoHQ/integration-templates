import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Supplier ID. Example: 93640706'),
    version: z.number().int().optional().describe('Optimistic locking version. Fetched automatically if omitted.'),
    name: z.string().optional(),
    email: z.string().optional(),
    organizationNumber: z.string().optional(),
    supplierNumber: z.number().int().optional(),
    phoneNumber: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    description: z.string().optional(),
    invoiceEmail: z.string().optional(),
    overdueNoticeEmail: z.string().optional(),
    website: z.string().optional(),
    isInactive: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
    isPrivateIndividual: z.boolean().optional(),
    showProducts: z.boolean().optional(),
    language: z.enum(['NO', 'EN']).optional()
});

const SupplierSchema = z.object({
    id: z.number().int(),
    version: z.number().int(),
    url: z.string().optional(),
    name: z.string(),
    organizationNumber: z.string().optional(),
    supplierNumber: z.number().int().optional(),
    customerNumber: z.number().int().optional(),
    isSupplier: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
    isInactive: z.boolean().optional(),
    email: z.string().optional(),
    invoiceEmail: z.string().optional(),
    overdueNoticeEmail: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    description: z.string().optional(),
    isPrivateIndividual: z.boolean().optional(),
    showProducts: z.boolean().optional(),
    language: z.enum(['NO', 'EN']).optional(),
    isWholesaler: z.boolean().optional(),
    displayName: z.string().optional(),
    locale: z.string().optional(),
    website: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number().int(),
    version: z.number().int(),
    name: z.string(),
    organizationNumber: z.string().optional(),
    supplierNumber: z.number().int().optional(),
    customerNumber: z.number().int().optional(),
    isSupplier: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
    isInactive: z.boolean().optional(),
    email: z.string().optional(),
    invoiceEmail: z.string().optional(),
    overdueNoticeEmail: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    description: z.string().optional(),
    isPrivateIndividual: z.boolean().optional(),
    showProducts: z.boolean().optional(),
    language: z.enum(['NO', 'EN']).optional(),
    isWholesaler: z.boolean().optional(),
    displayName: z.string().optional(),
    locale: z.string().optional(),
    website: z.string().optional()
});

const action = createAction({
    description: 'Update a supplier.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let version = input.version;

        if (version === undefined) {
            const getResponse = await nango.get({
                // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
                endpoint: `v2/supplier/${encodeURIComponent(input.id)}`,
                retries: 3
            });

            const wrapper = z.object({ value: SupplierSchema }).parse(getResponse.data);
            version = wrapper.value.version;
        }

        const body: Record<string, unknown> = {
            id: input.id,
            version: version
        };

        if (input.name !== undefined) {
            body['name'] = input.name;
        }
        if (input.email !== undefined) {
            body['email'] = input.email;
        }
        if (input.organizationNumber !== undefined) {
            body['organizationNumber'] = input.organizationNumber;
        }
        if (input.supplierNumber !== undefined) {
            body['supplierNumber'] = input.supplierNumber;
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
        if (input.invoiceEmail !== undefined) {
            body['invoiceEmail'] = input.invoiceEmail;
        }
        if (input.overdueNoticeEmail !== undefined) {
            body['overdueNoticeEmail'] = input.overdueNoticeEmail;
        }
        if (input.website !== undefined) {
            body['website'] = input.website;
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
        if (input.showProducts !== undefined) {
            body['showProducts'] = input.showProducts;
        }
        if (input.language !== undefined) {
            body['language'] = input.language;
        }

        const response = await nango.put({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: `v2/supplier/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 3
        });

        const wrapper = z.object({ value: SupplierSchema }).parse(response.data);
        const supplier = wrapper.value;

        return {
            id: supplier.id,
            version: supplier.version,
            name: supplier.name,
            ...(supplier.organizationNumber !== undefined && { organizationNumber: supplier.organizationNumber }),
            ...(supplier.supplierNumber !== undefined && { supplierNumber: supplier.supplierNumber }),
            ...(supplier.customerNumber !== undefined && { customerNumber: supplier.customerNumber }),
            ...(supplier.isSupplier !== undefined && { isSupplier: supplier.isSupplier }),
            ...(supplier.isCustomer !== undefined && { isCustomer: supplier.isCustomer }),
            ...(supplier.isInactive !== undefined && { isInactive: supplier.isInactive }),
            ...(supplier.email !== undefined && { email: supplier.email }),
            ...(supplier.invoiceEmail !== undefined && { invoiceEmail: supplier.invoiceEmail }),
            ...(supplier.overdueNoticeEmail !== undefined && { overdueNoticeEmail: supplier.overdueNoticeEmail }),
            ...(supplier.phoneNumber !== undefined && { phoneNumber: supplier.phoneNumber }),
            ...(supplier.phoneNumberMobile !== undefined && { phoneNumberMobile: supplier.phoneNumberMobile }),
            ...(supplier.description !== undefined && { description: supplier.description }),
            ...(supplier.isPrivateIndividual !== undefined && { isPrivateIndividual: supplier.isPrivateIndividual }),
            ...(supplier.showProducts !== undefined && { showProducts: supplier.showProducts }),
            ...(supplier.language !== undefined && { language: supplier.language }),
            ...(supplier.isWholesaler !== undefined && { isWholesaler: supplier.isWholesaler }),
            ...(supplier.displayName !== undefined && { displayName: supplier.displayName }),
            ...(supplier.locale !== undefined && { locale: supplier.locale }),
            ...(supplier.website !== undefined && { website: supplier.website })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
