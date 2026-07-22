import { createSync } from 'nango';
import { z } from 'zod';

const OdooConnectionMetadataSchema = z.object({
    serverUrl: z.string().min(1),
    database: z.string().min(1)
});

const Many2oneSchema = z.union([z.tuple([z.number().int(), z.string()]), z.literal(false)]);

const ProviderProductSchema = z.object({
    id: z.number().int(),
    name: z.string().min(1),
    write_date: z.string(),
    list_price: z.union([z.number(), z.literal(false)]).optional(),
    standard_price: z.union([z.number(), z.literal(false)]).optional(),
    type: z.string().optional(),
    default_code: z.union([z.string(), z.literal(false)]).optional(),
    active: z.union([z.boolean(), z.literal(false)]).optional(),
    sale_ok: z.union([z.boolean(), z.literal(false)]).optional(),
    purchase_ok: z.union([z.boolean(), z.literal(false)]).optional(),
    categ_id: Many2oneSchema.optional(),
    uom_id: Many2oneSchema.optional()
});

const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    write_date: z.string(),
    list_price: z.number().optional(),
    standard_price: z.number().optional(),
    type: z.string().optional(),
    default_code: z.string().optional(),
    active: z.boolean().optional(),
    sale_ok: z.boolean().optional(),
    purchase_ok: z.boolean().optional(),
    categ_id: z.number().int().optional(),
    uom_id: z.number().int().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_id: z.number().int().nonnegative()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

function buildDomain(checkpoint: Checkpoint): Array<unknown> {
    if (!checkpoint.updated_after) {
        return [];
    }

    if ((checkpoint.last_id ?? 0) > 0) {
        return ['|', ['write_date', '>', checkpoint.updated_after], '&', ['write_date', '=', checkpoint.updated_after], ['id', '>', checkpoint.last_id]];
    }

    return [['write_date', '>', checkpoint.updated_after]];
}

const sync = createSync({
    description: 'Sync Odoo products.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    checkpoint: CheckpointSchema,
    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        let checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', last_id: 0 });
        const odooMetadata = OdooConnectionMetadataSchema.parse(await nango.getMetadata());
        const baseUrlOverride = `https://${odooMetadata.serverUrl}`;
        const headers = { 'x-odoo-database': odooMetadata.database };
        const limit = 100;

        while (true) {
            const response = await nango.post({
                // https://www.odoo.com/documentation/19.0/developer/reference/external_api.html
                endpoint: '/json/2/product.template/search_read',
                data: {
                    domain: buildDomain(checkpoint),
                    fields: [
                        'id',
                        'name',
                        'write_date',
                        'list_price',
                        'standard_price',
                        'type',
                        'default_code',
                        'active',
                        'sale_ok',
                        'purchase_ok',
                        'categ_id',
                        'uom_id'
                    ],
                    order: 'write_date asc, id asc',
                    limit
                },
                baseUrlOverride,
                headers,
                retries: 3
            });

            const records = z.array(z.unknown()).parse(response.data);
            if (records.length === 0) {
                break;
            }

            const products = records.map((record) => {
                const parsed = ProviderProductSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse product record: ${parsed.error.message}`);
                }

                const p = parsed.data;
                const categId = Array.isArray(p.categ_id) ? p.categ_id[0] : undefined;
                const uomId = Array.isArray(p.uom_id) ? p.uom_id[0] : undefined;

                return {
                    id: String(p.id),
                    name: p.name,
                    write_date: p.write_date,
                    ...(typeof p.list_price === 'number' && { list_price: p.list_price }),
                    ...(typeof p.standard_price === 'number' && { standard_price: p.standard_price }),
                    ...(p.type !== undefined && { type: p.type }),
                    ...(typeof p.default_code === 'string' && { default_code: p.default_code }),
                    ...(typeof p.active === 'boolean' && { active: p.active }),
                    ...(typeof p.sale_ok === 'boolean' && { sale_ok: p.sale_ok }),
                    ...(typeof p.purchase_ok === 'boolean' && { purchase_ok: p.purchase_ok }),
                    ...(categId !== undefined && { categ_id: categId }),
                    ...(uomId !== undefined && { uom_id: uomId })
                };
            });

            await nango.batchSave(products, 'Product');

            const lastProduct = products.at(-1);
            if (!lastProduct) {
                throw new Error('Expected at least one product after parsing the response page');
            }

            checkpoint = {
                updated_after: lastProduct.write_date,
                last_id: Number(lastProduct.id)
            };
            await nango.saveCheckpoint(checkpoint);

            if (records.length < limit) {
                break;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
