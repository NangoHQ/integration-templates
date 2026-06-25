import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TransactionLineSchema = z.object({
    id: z.string(),
    EntryID: z.string().optional(),
    AmountDC: z.number().optional(),
    GLAccount: z.string().optional(),
    GLAccountCode: z.string().optional(),
    Description: z.string().optional(),
    VATCode: z.string().optional(),
    Modified: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MeResponseSchema = z.object({
    d: z
        .object({
            CurrentDivision: z.number().optional(),
            results: z
                .array(
                    z.object({
                        CurrentDivision: z.number().optional()
                    })
                )
                .optional()
        })
        .optional()
});

const ProviderTransactionLineSchema = z.object({
    ID: z.string(),
    EntryID: z.string().nullable().optional(),
    AmountDC: z.number().nullable().optional(),
    GLAccount: z.string().nullable().optional(),
    GLAccountCode: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    VATCode: z.string().nullable().optional(),
    Modified: z.string()
});

const extraConfig: Record<string, unknown> = {
    endpoint: {
        path: '/syncs/transaction-lines',
        method: 'GET'
    }
};

const sync = createSync({
    ...extraConfig,
    description: 'Sync financial transaction line details including amounts and GL account assignments.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        TransactionLine: TransactionLineSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meParsed = MeResponseSchema.safeParse(meResponse.data);
        if (!meParsed.success) {
            throw new Error('Failed to parse Me response: ' + meParsed.error.message);
        }

        let division: number | undefined;
        const d = meParsed.data.d;
        if (d) {
            division = d.CurrentDivision;
            if (!division && d.results) {
                for (const result of d.results) {
                    if (result.CurrentDivision) {
                        division = result.CurrentDivision;
                        break;
                    }
                }
            }
        }
        if (!division) {
            throw new Error('CurrentDivision not found in Me response');
        }

        const paginateConfig: ProxyConfiguration['paginate'] = {
            type: 'link',
            link_path_in_response_body: 'd.__next',
            limit_name_in_request: '$top',
            limit: 100,
            response_path: 'd.results'
        };

        const proxyConfig: ProxyConfiguration = {
            // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-reference-financialtransaction-transactionlines
            endpoint: '/api/v1/' + encodeURIComponent(String(division)) + '/financialtransaction/TransactionLines',
            params: {
                $select: 'ID,EntryID,AmountDC,GLAccount,GLAccountCode,Description,VATCode,Modified',
                $orderby: 'Modified asc',
                ...(checkpoint != null && checkpoint['updated_after'] && { $filter: "Modified gt datetime'" + checkpoint['updated_after'] + "'" })
            },
            paginate: paginateConfig,
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const lines: z.infer<typeof TransactionLineSchema>[] = [];

            for (const raw of page) {
                const parsed = ProviderTransactionLineSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error('Failed to parse TransactionLine: ' + parsed.error.message);
                }

                const data = parsed.data;
                lines.push({
                    id: data.ID,
                    ...(data.EntryID != null && { EntryID: data.EntryID }),
                    ...(data.AmountDC != null && { AmountDC: data.AmountDC }),
                    ...(data.GLAccount != null && { GLAccount: data.GLAccount }),
                    ...(data.GLAccountCode != null && { GLAccountCode: data.GLAccountCode }),
                    ...(data.Description != null && { Description: data.Description }),
                    ...(data.VATCode != null && { VATCode: data.VATCode }),
                    Modified: data.Modified
                });
            }

            if (lines.length === 0) {
                continue;
            }

            await nango.batchSave(lines, 'TransactionLine');

            const lastLine = lines[lines.length - 1];
            if (lastLine) {
                await nango.saveCheckpoint({
                    updated_after: lastLine.Modified
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
