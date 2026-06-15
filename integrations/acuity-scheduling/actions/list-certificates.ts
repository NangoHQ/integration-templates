import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    productID: z.string().optional().describe('Get certificate codes for a particular product.'),
    orderID: z.string().optional().describe('Get certificate codes for a particular order.'),
    appointmentTypeID: z.string().optional().describe('Get certificate codes for a particular appointment type.'),
    email: z.string().optional().describe('Get valid codes for a particular email address.')
});

const ProviderRemainingCountsSchema = z.record(z.string(), z.number());

const ProviderCertificateSchema = z.object({
    id: z.number(),
    certificate: z.string().nullable().optional(),
    productID: z.number().nullable().optional(),
    orderID: z.string().nullable().optional(),
    appointmentTypeIDs: z.array(z.number()).nullable().optional(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    remainingCounts: ProviderRemainingCountsSchema.nullable().optional(),
    remainingMinutes: z.string().nullable().optional(),
    expiration: z.string().nullable().optional()
});

const OutputSchema = z.object({
    certificates: z.array(
        z.object({
            id: z.number(),
            certificate: z.string().optional(),
            productID: z.number().optional(),
            orderID: z.string().optional(),
            appointmentTypeIDs: z.array(z.number()).optional(),
            name: z.string().optional(),
            email: z.string().optional(),
            type: z.string().optional(),
            remainingCounts: z.record(z.string(), z.number()).optional(),
            remainingMinutes: z.string().optional(),
            expiration: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'List package and gift certificates.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-certificates',
        group: 'Certificates'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.acuityscheduling.com/reference/get-certificates
            endpoint: '/certificates',
            params: {
                ...(input.productID !== undefined && { productID: input.productID }),
                ...(input.orderID !== undefined && { orderID: input.orderID }),
                ...(input.appointmentTypeID !== undefined && { appointmentTypeID: input.appointmentTypeID }),
                ...(input.email !== undefined && { email: input.email })
            },
            retries: 3
        });

        const providerCertificates = z.array(ProviderCertificateSchema).parse(response.data);

        return {
            certificates: providerCertificates.map((cert) => ({
                id: cert.id,
                ...(cert.certificate != null && { certificate: cert.certificate }),
                ...(cert.productID != null && { productID: cert.productID }),
                ...(cert.orderID != null && { orderID: cert.orderID }),
                ...(cert.appointmentTypeIDs != null && { appointmentTypeIDs: cert.appointmentTypeIDs }),
                ...(cert.name != null && { name: cert.name }),
                ...(cert.email != null && { email: cert.email }),
                ...(cert.type != null && { type: cert.type }),
                ...(cert.remainingCounts != null && { remainingCounts: cert.remainingCounts }),
                ...(cert.remainingMinutes != null && { remainingMinutes: cert.remainingMinutes }),
                ...(cert.expiration != null && { expiration: cert.expiration })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
