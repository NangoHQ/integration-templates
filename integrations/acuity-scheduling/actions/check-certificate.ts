import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    certificate: z.string().describe('The certificate code to check. Example: "BFB0E13E"'),
    appointmentTypeID: z.number().describe('The appointment type ID to check. Example: 94517100'),
    email: z.string().optional().describe('An optional email address to check if the certificate is valid for. Example: "client@example.com"')
});

const ProviderCertificateSchema = z.object({
    id: z.number(),
    certificate: z.string(),
    productID: z.number().optional(),
    orderID: z.number().nullable().optional(),
    appointmentTypeIDs: z.array(z.number()).optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    type: z.string().optional(),
    remainingCounts: z.record(z.string(), z.number()).optional(),
    remainingMinutes: z.number().nullable().optional(),
    expiration: z.string().nullable().optional()
});

const OutputSchema = z.object({
    valid: z.boolean().describe('Whether the certificate is valid for the given appointment type.'),
    id: z.number().optional().describe('Certificate ID if valid. Example: 1'),
    certificate: z.string().optional().describe('Certificate code if valid. Example: "BFB0E13E"'),
    productID: z.number().optional().describe('Product ID associated with the certificate. Example: 1'),
    orderID: z.number().nullable().optional().describe('Order ID associated with the certificate. Example: null'),
    appointmentTypeIDs: z.array(z.number()).optional().describe('Appointment type IDs the certificate applies to. Example: [1]'),
    name: z.string().optional().describe('Name of the certificate. Example: "5 Small Builds"'),
    email: z.string().optional().describe('Email address associated with the certificate. Example: ""'),
    type: z.string().optional().describe('Certificate type. Example: "appointments"'),
    remainingCounts: z.record(z.string(), z.number()).optional().describe('Remaining usage counts per appointment type. Example: { "1": 5 }'),
    remainingMinutes: z.number().nullable().optional().describe('Remaining minutes on the certificate. Example: null'),
    expiration: z.string().nullable().optional().describe('Expiration date of the certificate. Example: null'),
    error: z.string().optional().describe('Error message if the certificate is invalid.')
});

const ErrorResponseSchema = z.object({
    status_code: z.number().optional(),
    message: z.string().optional(),
    error: z.string().optional()
});

const AxiosErrorSchema = z.object({
    response: z
        .object({
            status: z.number(),
            data: z.unknown()
        })
        .optional()
});

const action = createAction({
    description: 'Verify a certificate or coupon code.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/check-certificate',
        group: 'Certificates'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            certificate: input.certificate,
            appointmentTypeID: input.appointmentTypeID
        };

        if (input.email !== undefined) {
            params['email'] = input.email;
        }

        // @allowTryCatch The API returns HTTP 400 for invalid certificates and we want to normalize this into a structured validation result instead of throwing a generic HTTP error.
        try {
            const response = await nango.get({
                // https://developers.acuityscheduling.com/reference/get-certificates-check
                endpoint: '/certificates/check',
                params,
                retries: 3
            });

            if (response.status === 400) {
                const errorData = ErrorResponseSchema.parse(response.data);
                return {
                    valid: false,
                    error: errorData.message || 'Invalid certificate'
                };
            }

            const providerCertificate = ProviderCertificateSchema.parse(response.data);

            return {
                valid: true,
                id: providerCertificate.id,
                certificate: providerCertificate.certificate,
                ...(providerCertificate.productID !== undefined && { productID: providerCertificate.productID }),
                ...(providerCertificate.orderID !== undefined && { orderID: providerCertificate.orderID }),
                ...(providerCertificate.appointmentTypeIDs !== undefined && { appointmentTypeIDs: providerCertificate.appointmentTypeIDs }),
                ...(providerCertificate.name !== undefined && { name: providerCertificate.name }),
                ...(providerCertificate.email !== undefined && { email: providerCertificate.email }),
                ...(providerCertificate.type !== undefined && { type: providerCertificate.type }),
                ...(providerCertificate.remainingCounts !== undefined && { remainingCounts: providerCertificate.remainingCounts }),
                ...(providerCertificate.remainingMinutes !== undefined && { remainingMinutes: providerCertificate.remainingMinutes }),
                ...(providerCertificate.expiration !== undefined && { expiration: providerCertificate.expiration })
            };
        } catch (err) {
            const parsedError = AxiosErrorSchema.safeParse(err);
            if (parsedError.success && parsedError.data.response?.status === 400) {
                const errorData = ErrorResponseSchema.parse(parsedError.data.response.data);
                return {
                    valid: false,
                    error: errorData.message || 'Invalid certificate'
                };
            }
            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
