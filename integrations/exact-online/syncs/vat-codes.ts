import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const VatCodeSchema = z.object({
    id: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
    modified: z.string().optional()
});

const MeResultSchema = z.object({
    CurrentDivision: z.number().optional()
});

const MeResponseSchema = z.object({
    d: z
        .object({
            results: z.array(MeResultSchema).optional()
        })
        .optional()
});

const VatCodeItemSchema = z.object({
    ID: z.string(),
    Code: z.string().optional(),
    Description: z.string().optional(),
    Modified: z.string().optional()
});

const PaginatePageSchema = z.union([
    z.array(z.unknown()),
    z
        .object({
            d: z
                .union([
                    z.array(z.unknown()),
                    z
                        .object({
                            results: z.array(z.unknown()).optional()
                        })
                        .optional()
                ])
                .optional()
        })
        .optional()
]);

const sync = createSync({
    description: 'Sync VAT/tax codes as full snapshot',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        VatCode: VatCodeSchema
    },

    exec: async (nango) => {
        // https://start.exactonline.nl/docs/HlpRestAPIResources.aspx?SourceAction=10
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meParsed = MeResponseSchema.safeParse(meResponse.data);
        if (!meParsed.success) {
            throw new Error(`Failed to parse Me response: ${meParsed.error.message}`);
        }

        const currentDivision = meParsed.data.d?.results?.[0]?.CurrentDivision;
        if (currentDivision === undefined) {
            throw new Error('CurrentDivision not found in Me response');
        }

        await nango.trackDeletesStart('VatCode');

        const proxyConfig: ProxyConfiguration = {
            // https://start.exactonline.nl/docs/HlpRestAPIResources.aspx?SourceAction=10
            endpoint: `/api/v1/${encodeURIComponent(String(currentDivision))}/vat/VATCodes`,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'd.__next',
                limit_name_in_request: '$top',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedPage = PaginatePageSchema.safeParse(page);
            if (!parsedPage.success) {
                throw new Error(`Failed to parse paginate page: ${parsedPage.error.message}`);
            }

            let records: unknown[];
            if (Array.isArray(parsedPage.data)) {
                records = parsedPage.data;
            } else if (parsedPage.data && parsedPage.data.d) {
                if (Array.isArray(parsedPage.data.d)) {
                    records = parsedPage.data.d;
                } else if (parsedPage.data.d.results) {
                    records = parsedPage.data.d.results;
                } else {
                    records = [];
                }
            } else {
                records = [];
            }

            const vatCodes = [];
            for (const record of records) {
                const parsed = VatCodeItemSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse VAT code: ${parsed.error.message}`);
                }
                vatCodes.push({
                    id: parsed.data.ID,
                    ...(parsed.data.Code !== undefined && { code: parsed.data.Code.trim() }),
                    ...(parsed.data.Description !== undefined && { description: parsed.data.Description }),
                    ...(parsed.data.Modified !== undefined && { modified: parsed.data.Modified })
                });
            }

            if (vatCodes.length > 0) {
                await nango.batchSave(vatCodes, 'VatCode');
            }
        }

        await nango.trackDeletesEnd('VatCode');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
