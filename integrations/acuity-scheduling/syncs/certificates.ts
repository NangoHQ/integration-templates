import { createSync } from 'nango';
import { z } from 'zod';

const ProviderCertificateSchema = z.object({
    id: z.number(),
    certificate: z.string(),
    productID: z.number().optional(),
    orderID: z.number().nullable().optional(),
    appointmentTypeIDs: z.array(z.number()).optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    type: z.string().optional(),
    remainingCounts: z.record(z.string(), z.number()).nullable().optional(),
    remainingMinutes: z.number().nullable().optional(),
    expiration: z.string().nullable().optional()
});

const CertificateSchema = z.object({
    id: z.string(),
    certificate: z.string(),
    productID: z.number().optional(),
    orderID: z.number().optional(),
    appointmentTypeIDs: z.array(z.number()).optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    type: z.string().optional(),
    remainingCounts: z.record(z.string(), z.number()).optional(),
    remainingMinutes: z.number().optional(),
    expiration: z.string().optional()
});

const sync = createSync({
    description: 'Sync package and gift certificates',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Certificate: CertificateSchema
    },
    endpoints: [
        {
            path: '/syncs/certificates',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        await nango.trackDeletesStart('Certificate');

        // https://developers.acuityscheduling.com/reference/get-certificates
        const response = await nango.get({
            endpoint: '/certificates',
            retries: 3
        });

        const parsedCertificates = z.array(ProviderCertificateSchema).safeParse(response.data);
        if (!parsedCertificates.success) {
            throw new Error('Failed to parse certificates response: ' + parsedCertificates.error.message);
        }

        const records = parsedCertificates.data.map((record) => ({
            id: String(record.id),
            certificate: record.certificate,
            ...(record.productID != null && { productID: record.productID }),
            ...(record.orderID != null && { orderID: record.orderID }),
            ...(record.appointmentTypeIDs != null && { appointmentTypeIDs: record.appointmentTypeIDs }),
            ...(record.name != null && { name: record.name }),
            ...(record.email != null && { email: record.email }),
            ...(record.type != null && { type: record.type }),
            ...(record.remainingCounts != null && { remainingCounts: record.remainingCounts }),
            ...(record.remainingMinutes != null && { remainingMinutes: record.remainingMinutes }),
            ...(record.expiration != null && { expiration: record.expiration })
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'Certificate');
        }

        await nango.trackDeletesEnd('Certificate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
