import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative()
});

const VendorSchema = z
    .object({
        id: z.string().describe('Unique identifier for the vendor.'),
        type: z.string().optional().describe('The type of object, always "vendor" for vendor records.'),
        summary: z
            .string()
            .optional()
            .describe('A short-form, server-generated string that provides succinct, important information about the vendor suitable for primary labeling.'),
        self: z.string().optional().describe('The API show URL at which the vendor object is accessible.'),
        html_url: z.string().optional().describe('A URL at which the vendor is uniquely displayed in the PagerDuty web app.'),
        name: z.string().optional().describe('The short name of the vendor.'),
        website_url: z.string().optional().describe("URL of the vendor's main website."),
        logo_url: z.string().optional().describe('URL of a logo identifying the vendor.'),
        thumbnail_url: z.string().optional().describe('URL of a small thumbnail image identifying the vendor.'),
        description: z.string().optional().describe('A short description of this vendor, and common use-cases of integrations for this vendor.'),
        integration_guide_url: z.string().optional().describe('URL of an integration guide for this vendor.')
    })
    .describe('A PagerDuty Vendor represents a specific type of integration.');

const ProviderVendorSchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    name: z.string().optional(),
    website_url: z.string().nullable().optional(),
    logo_url: z.string().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    integration_guide_url: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Sync the global integration-vendor-type catalog.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Vendor: VendorSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const rawOffset = checkpoint?.['offset'];
        let offset = typeof rawOffset === 'number' ? rawOffset : 0;

        await nango.trackDeletesStart('Vendor');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.pagerduty.com/api-reference/
            endpoint: '/vendors',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: offset,
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'vendors'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items: unknown[] = page;

            const records = items.map((raw) => {
                const parsed = ProviderVendorSchema.parse(raw);

                return {
                    id: parsed.id,
                    ...(parsed.type !== undefined && { type: parsed.type }),
                    ...(parsed.summary != null && { summary: parsed.summary }),
                    ...(parsed.self != null && { self: parsed.self }),
                    ...(parsed.html_url != null && { html_url: parsed.html_url }),
                    ...(parsed.name !== undefined && { name: parsed.name }),
                    ...(parsed.website_url != null && { website_url: parsed.website_url }),
                    ...(parsed.logo_url != null && { logo_url: parsed.logo_url }),
                    ...(parsed.thumbnail_url != null && { thumbnail_url: parsed.thumbnail_url }),
                    ...(parsed.description != null && { description: parsed.description }),
                    ...(parsed.integration_guide_url != null && { integration_guide_url: parsed.integration_guide_url })
                };
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'Vendor');
            }

            offset += items.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Vendor');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
