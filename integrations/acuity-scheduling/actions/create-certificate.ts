import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    productID: z.number().optional().describe('The package ID to create a certificate for. Example: 2231275'),
    couponID: z.number().optional().describe('The coupon ID to create a certificate for.'),
    certificate: z.string().optional().describe('Custom certificate code. Auto-generated if omitted. Example: "NANGO-TEST-001"'),
    email: z.string().optional().describe('Email address to assign the certificate to. Example: "bob.mctest@example.com"')
});

const ProviderCertificateSchema = z
    .object({
        id: z.number(),
        certificate: z.string().optional(),
        productID: z.number().optional(),
        couponID: z.number().optional(),
        email: z.string().optional(),
        orderID: z.number().nullable().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number().describe('Certificate ID. Example: 81297390'),
        certificate: z.string().optional().describe('Certificate code. Example: "NANGO-TEST-001"'),
        productID: z.number().optional().describe('Associated package ID. Example: 2231275'),
        couponID: z.number().optional().describe('Associated coupon ID.'),
        email: z.string().optional().describe('Assigned email address. Example: "bob.mctest@example.com"'),
        orderID: z.number().nullable().optional().describe('Associated order ID, null if created via API.')
    })
    .passthrough();

const action = createAction({
    description: 'Create a package or gift certificate.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-certificate',
        group: 'Certificates'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.productID === undefined && input.couponID === undefined) {
            throw new nango.ActionError({
                type: 'missing_required_attribute',
                message: 'Either productID or couponID is required to create a certificate.'
            });
        }

        const response = await nango.post({
            // https://developers.acuityscheduling.com/reference/post-certificates
            endpoint: '/certificates',
            data: {
                ...(input.productID !== undefined && { productID: input.productID }),
                ...(input.couponID !== undefined && { couponID: input.couponID }),
                ...(input.certificate !== undefined && { certificate: input.certificate }),
                ...(input.email !== undefined && { email: input.email })
            },
            retries: 10
        });

        const providerCertificate = ProviderCertificateSchema.parse(response.data);

        return {
            id: providerCertificate.id,
            ...(providerCertificate.certificate !== undefined && { certificate: providerCertificate.certificate }),
            ...(providerCertificate.productID !== undefined && { productID: providerCertificate.productID }),
            ...(providerCertificate.couponID !== undefined && { couponID: providerCertificate.couponID }),
            ...(providerCertificate.email !== undefined && { email: providerCertificate.email }),
            ...(providerCertificate.orderID !== undefined && { orderID: providerCertificate.orderID })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
