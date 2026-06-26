import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DivisionSchema = z.object({
    id: z.string(),
    Code: z.number().int(),
    Description: z.string().optional(),
    Currency: z.string().optional(),
    Country: z.string().optional(),
    Status: z.number().int().optional(),
    Email: z.string().optional()
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z
            .array(
                z.object({
                    CurrentDivision: z.number().int()
                })
            )
            .min(1)
    })
});

const ProviderDivisionSchema = z.object({
    Code: z.number().int(),
    Description: z.string().nullable().optional(),
    Currency: z.string().nullable().optional(),
    Country: z.string().nullable().optional(),
    Status: z.number().int().nullable().optional(),
    Email: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Sync divisions/administrations as full snapshot',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Division: DivisionSchema
    },
    endpoints: [
        {
            path: '/syncs/divisions',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapime
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meParsed = MeResponseSchema.safeParse(meResponse.data);
        if (!meParsed.success) {
            throw new Error('Failed to parse Me response: ' + meParsed.error.message);
        }

        const meResult = meParsed.data.d.results[0];
        if (meResult === undefined) {
            throw new Error('Me response results array is empty');
        }
        const currentDivision = meResult.CurrentDivision;

        // Full-refresh is required by the sync design for a complete snapshot of divisions.
        await nango.trackDeletesStart('Division');

        const proxyConfig: ProxyConfiguration = {
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapisystemdivisions
            endpoint: `/api/v1/${encodeURIComponent(String(currentDivision))}/system/Divisions`,
            retries: 3,
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_calculation_method: 'per-page',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'd.results'
            }
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const divisions = [];
            for (const raw of page) {
                const parsed = ProviderDivisionSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error('Failed to parse division record: ' + parsed.error.message);
                }
                const record = parsed.data;
                divisions.push({
                    id: String(record.Code),
                    Code: record.Code,
                    ...(record.Description != null && { Description: record.Description }),
                    ...(record.Currency != null && { Currency: record.Currency }),
                    ...(record.Country != null && { Country: record.Country }),
                    ...(record.Status != null && { Status: record.Status }),
                    ...(record.Email != null && { Email: record.Email })
                });
            }

            if (divisions.length > 0) {
                await nango.batchSave(divisions, 'Division');
            }
        }

        await nango.trackDeletesEnd('Division');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
