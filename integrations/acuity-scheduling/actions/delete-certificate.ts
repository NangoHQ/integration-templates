import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Certificate ID. Example: 123')
});

const ProviderCertificateSchema = z
    .object({
        id: z.number(),
        certificate: z.string().optional(),
        appointmentTypeID: z.number().optional(),
        email: z.string().optional(),
        notes: z.string().optional(),
        quantity: z.number().optional(),
        balance: z.number().optional(),
        massage: z.string().optional(),
        from: z.string().optional(),
        date: z.string().optional(),
        expiration: z.string().optional(),
        productID: z.number().optional(),
        couponID: z.number().optional(),
        orderID: z.number().optional(),
        price: z.number().optional(),
        datetime: z.string().optional(),
        calendarID: z.number().optional(),
        typeID: z.number().optional(),
        created: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    certificate: z.string().optional(),
    appointmentTypeID: z.number().optional(),
    email: z.string().optional(),
    notes: z.string().optional(),
    quantity: z.number().optional(),
    balance: z.number().optional(),
    massage: z.string().optional(),
    from: z.string().optional(),
    date: z.string().optional(),
    expiration: z.string().optional(),
    productID: z.number().optional(),
    couponID: z.number().optional(),
    orderID: z.number().optional(),
    price: z.number().optional(),
    datetime: z.string().optional(),
    calendarID: z.number().optional(),
    typeID: z.number().optional(),
    created: z.string().optional()
});

const action = createAction({
    description: 'Delete a certificate.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-certificate',
        group: 'Certificates'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.acuityscheduling.com/reference/delete-certificates-id
            endpoint: `/certificates/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (response.status === 204 || !response.data) {
            return { id: input.id };
        }

        const providerCertificate = ProviderCertificateSchema.parse(response.data);

        return {
            id: providerCertificate.id,
            ...(providerCertificate.certificate !== undefined && { certificate: providerCertificate.certificate }),
            ...(providerCertificate.appointmentTypeID !== undefined && { appointmentTypeID: providerCertificate.appointmentTypeID }),
            ...(providerCertificate.email !== undefined && { email: providerCertificate.email }),
            ...(providerCertificate.notes !== undefined && { notes: providerCertificate.notes }),
            ...(providerCertificate.quantity !== undefined && { quantity: providerCertificate.quantity }),
            ...(providerCertificate.balance !== undefined && { balance: providerCertificate.balance }),
            ...(providerCertificate.massage !== undefined && { massage: providerCertificate.massage }),
            ...(providerCertificate.from !== undefined && { from: providerCertificate.from }),
            ...(providerCertificate.date !== undefined && { date: providerCertificate.date }),
            ...(providerCertificate.expiration !== undefined && { expiration: providerCertificate.expiration }),
            ...(providerCertificate.productID !== undefined && { productID: providerCertificate.productID }),
            ...(providerCertificate.couponID !== undefined && { couponID: providerCertificate.couponID }),
            ...(providerCertificate.orderID !== undefined && { orderID: providerCertificate.orderID }),
            ...(providerCertificate.price !== undefined && { price: providerCertificate.price }),
            ...(providerCertificate.datetime !== undefined && { datetime: providerCertificate.datetime }),
            ...(providerCertificate.calendarID !== undefined && { calendarID: providerCertificate.calendarID }),
            ...(providerCertificate.typeID !== undefined && { typeID: providerCertificate.typeID }),
            ...(providerCertificate.created !== undefined && { created: providerCertificate.created })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
