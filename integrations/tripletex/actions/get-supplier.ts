import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Supplier ID. Example: 93640706')
});

const ProviderSupplierSchema = z
    .object({
        id: z.number(),
        version: z.number().optional(),
        name: z.string().optional().nullable(),
        organizationNumber: z.string().optional().nullable(),
        supplierNumber: z.number().optional().nullable(),
        email: z.string().optional().nullable(),
        phoneNumber: z.string().optional().nullable(),
        phoneNumberMobile: z.string().optional().nullable(),
        faxNumber: z.string().optional().nullable(),
        address: z
            .object({
                addressLine1: z.string().optional().nullable(),
                addressLine2: z.string().optional().nullable(),
                postalCode: z.string().optional().nullable(),
                city: z.string().optional().nullable(),
                country: z
                    .object({
                        id: z.number().optional().nullable(),
                        name: z.string().optional().nullable()
                    })
                    .optional()
                    .nullable()
            })
            .optional()
            .nullable(),
        deliveryAddress: z
            .object({
                addressLine1: z.string().optional().nullable(),
                addressLine2: z.string().optional().nullable(),
                postalCode: z.string().optional().nullable(),
                city: z.string().optional().nullable(),
                country: z
                    .object({
                        id: z.number().optional().nullable(),
                        name: z.string().optional().nullable()
                    })
                    .optional()
                    .nullable()
            })
            .optional()
            .nullable(),
        isSupplier: z.boolean().optional().nullable(),
        isCustomer: z.boolean().optional().nullable(),
        isInactive: z.boolean().optional().nullable(),
        accountNumber: z.string().optional().nullable(),
        url: z.string().optional().nullable()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    value: ProviderSupplierSchema
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    organizationNumber: z.string().optional(),
    supplierNumber: z.number().optional(),
    email: z.string().optional(),
    phoneNumber: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    faxNumber: z.string().optional(),
    address: z
        .object({
            addressLine1: z.string().optional(),
            addressLine2: z.string().optional(),
            postalCode: z.string().optional(),
            city: z.string().optional(),
            country: z
                .object({
                    id: z.number().optional(),
                    name: z.string().optional()
                })
                .optional()
        })
        .optional(),
    deliveryAddress: z
        .object({
            addressLine1: z.string().optional(),
            addressLine2: z.string().optional(),
            postalCode: z.string().optional(),
            city: z.string().optional(),
            country: z
                .object({
                    id: z.number().optional(),
                    name: z.string().optional()
                })
                .optional()
        })
        .optional(),
    isSupplier: z.boolean().optional(),
    isCustomer: z.boolean().optional(),
    isInactive: z.boolean().optional(),
    accountNumber: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a supplier.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: `v2/supplier/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Tripletex API',
                details: parsed.error.issues
            });
        }

        const supplier = parsed.data.value;

        return {
            id: supplier.id,
            ...(supplier.name != null && { name: supplier.name }),
            ...(supplier.organizationNumber != null && {
                organizationNumber: supplier.organizationNumber
            }),
            ...(supplier.supplierNumber != null && {
                supplierNumber: supplier.supplierNumber
            }),
            ...(supplier.email != null && { email: supplier.email }),
            ...(supplier.phoneNumber != null && {
                phoneNumber: supplier.phoneNumber
            }),
            ...(supplier.phoneNumberMobile != null && {
                phoneNumberMobile: supplier.phoneNumberMobile
            }),
            ...(supplier.faxNumber != null && { faxNumber: supplier.faxNumber }),
            ...(supplier.address != null && {
                address: {
                    ...(supplier.address.addressLine1 != null && {
                        addressLine1: supplier.address.addressLine1
                    }),
                    ...(supplier.address.addressLine2 != null && {
                        addressLine2: supplier.address.addressLine2
                    }),
                    ...(supplier.address.postalCode != null && {
                        postalCode: supplier.address.postalCode
                    }),
                    ...(supplier.address.city != null && {
                        city: supplier.address.city
                    }),
                    ...(supplier.address.country != null && {
                        country: {
                            ...(supplier.address.country.id != null && {
                                id: supplier.address.country.id
                            }),
                            ...(supplier.address.country.name != null && {
                                name: supplier.address.country.name
                            })
                        }
                    })
                }
            }),
            ...(supplier.deliveryAddress != null && {
                deliveryAddress: {
                    ...(supplier.deliveryAddress.addressLine1 != null && {
                        addressLine1: supplier.deliveryAddress.addressLine1
                    }),
                    ...(supplier.deliveryAddress.addressLine2 != null && {
                        addressLine2: supplier.deliveryAddress.addressLine2
                    }),
                    ...(supplier.deliveryAddress.postalCode != null && {
                        postalCode: supplier.deliveryAddress.postalCode
                    }),
                    ...(supplier.deliveryAddress.city != null && {
                        city: supplier.deliveryAddress.city
                    }),
                    ...(supplier.deliveryAddress.country != null && {
                        country: {
                            ...(supplier.deliveryAddress.country.id != null && {
                                id: supplier.deliveryAddress.country.id
                            }),
                            ...(supplier.deliveryAddress.country.name != null && {
                                name: supplier.deliveryAddress.country.name
                            })
                        }
                    })
                }
            }),
            ...(supplier.isSupplier != null && { isSupplier: supplier.isSupplier }),
            ...(supplier.isCustomer != null && { isCustomer: supplier.isCustomer }),
            ...(supplier.isInactive != null && { isInactive: supplier.isInactive }),
            ...(supplier.accountNumber != null && {
                accountNumber: supplier.accountNumber
            }),
            ...(supplier.url != null && { url: supplier.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
