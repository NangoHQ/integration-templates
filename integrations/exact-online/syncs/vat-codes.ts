import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const VatCodeSchema = z.object({
    id: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
    modified: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
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
    Code: z.string().nullish(),
    Description: z.string().nullish(),
    Modified: z.string().nullish()
});

const VatCodesArrayResponseSchema = z.object({
    d: z.array(z.unknown())
});

const VatCodesObjectResponseSchema = z.object({
    d: z.object({
        results: z.array(z.unknown()).optional(),
        __next: z.string().optional()
    })
});

const VatCodesResponseSchema = z.union([VatCodesArrayResponseSchema, VatCodesObjectResponseSchema]);

const sync = createSync({
    description: 'Sync VAT/tax codes as full snapshot',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
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

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParse = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = checkpointParse.success ? checkpointParse.data : { cursor: '' };

        await nango.trackDeletesStart('VatCode');

        const limit = 100;
        let hasMore = true;
        let cursor: string | undefined = checkpoint.cursor || undefined;

        while (hasMore) {
            const isNumericCursor = cursor !== undefined && !Number.isNaN(Number(cursor));
            const skip = isNumericCursor ? Number(cursor) : undefined;
            const skipToken = !isNumericCursor && cursor ? cursor : undefined;

            const proxyConfig: ProxyConfiguration = {
                // https://start.exactonline.nl/docs/HlpRestAPIResources.aspx?SourceAction=10
                endpoint: `/api/v1/${encodeURIComponent(String(currentDivision))}/vat/VATCodes`,
                params: {
                    $top: limit.toString(),
                    ...(skip !== undefined && { $skip: skip.toString() }),
                    ...(skipToken !== undefined && { $skiptoken: skipToken })
                },
                retries: 3
            };

            const vatResponse = await nango.get(proxyConfig);
            const vatData = VatCodesResponseSchema.parse(vatResponse.data);

            let records: unknown[];
            let nextLink: string | undefined;

            if (Array.isArray(vatData.d)) {
                records = vatData.d;
                nextLink = undefined;
            } else {
                records = vatData.d.results ?? [];
                nextLink = vatData.d.__next;
            }

            const vatCodes = [];
            for (const record of records) {
                const parsed = VatCodeItemSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse VAT code: ${parsed.error.message}`);
                }
                vatCodes.push({
                    id: parsed.data.ID,
                    ...(parsed.data.Code != null && { code: parsed.data.Code.trim() }),
                    ...(parsed.data.Description != null && { description: parsed.data.Description }),
                    ...(parsed.data.Modified != null && { modified: parsed.data.Modified })
                });
            }

            if (vatCodes.length > 0) {
                await nango.batchSave(vatCodes, 'VatCode');
            }

            if (nextLink) {
                const nextUrl = new URL(nextLink);
                const nextCursor = nextUrl.searchParams.get('$skiptoken') ?? nextUrl.searchParams.get('$skip') ?? undefined;
                if (!nextCursor) {
                    throw new Error(`Failed to extract pagination cursor from __next URL: ${nextLink}`);
                }
                await nango.saveCheckpoint({ cursor: nextCursor });
                cursor = nextCursor;
            } else {
                hasMore = false;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('VatCode');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
