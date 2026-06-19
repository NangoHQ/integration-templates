import { createSync } from 'nango';
import { z } from 'zod';

const ProductSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.string().optional(),
    type: z.string().optional(),
    hidden: z.boolean().optional(),
    expires: z.number().optional(),
    appointmentTypeIDs: z.array(z.number()).optional(),
    appointmentTypeCounts: z.record(z.string(), z.number()).optional(),
    minutes: z.number().optional()
});

const sync = createSync({
    description: 'Sync products.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /products with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor. Products are
        // relatively static reference data, so full-refresh delete tracking is used.

        // https://developers.acuityscheduling.com/reference/get-products
        const response = await nango.get({
            endpoint: '/products',
            retries: 3
        });

        const rawProducts = response.data;
        if (!Array.isArray(rawProducts)) {
            throw new Error('Expected products response to be an array');
        }

        await nango.trackDeletesStart('Product');

        const products: Array<z.infer<typeof ProductSchema>> = [];
        for (const raw of rawProducts) {
            if (typeof raw !== 'object' || raw === null) {
                throw new Error('Expected product to be an object');
            }

            const product = {
                id: String(raw.id),
                ...(typeof raw.name === 'string' && { name: raw.name }),
                ...(typeof raw.description === 'string' && { description: raw.description }),
                ...(typeof raw.price === 'string' && { price: raw.price }),
                ...(typeof raw.type === 'string' && { type: raw.type }),
                ...(typeof raw.hidden === 'boolean' && { hidden: raw.hidden }),
                ...(typeof raw.expires === 'number' && { expires: raw.expires }),
                ...(Array.isArray(raw.appointmentTypeIDs) && { appointmentTypeIDs: raw.appointmentTypeIDs }),
                ...(typeof raw.appointmentTypeCounts === 'object' &&
                    raw.appointmentTypeCounts !== null && {
                        appointmentTypeCounts: raw.appointmentTypeCounts
                    }),
                ...(typeof raw.minutes === 'number' && { minutes: raw.minutes })
            };
            products.push(product);
        }

        if (products.length > 0) {
            await nango.batchSave(products, 'Product');
        }

        await nango.trackDeletesEnd('Product');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
