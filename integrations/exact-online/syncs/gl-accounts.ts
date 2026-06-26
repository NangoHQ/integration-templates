import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const GlAccountSchema = z.object({
    id: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
    modified: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const GlAccountPageItemSchema = z.object({
    ID: z.string(),
    Code: z.string().optional(),
    Description: z.string().optional(),
    Modified: z.string()
});

function normalizeModified(value: string): string {
    const match = value.match(/^\/Date\((\d+)\)\/$/);
    if (match) {
        return new Date(Number(match[1])).toISOString().slice(0, 19);
    }
    return value;
}

const sync = createSync({
    description: 'Sync general ledger accounts as full snapshot.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        GlAccount: GlAccountSchema
    },
    endpoints: [
        {
            path: '/syncs/gl-accounts',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParse = CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = checkpointParse.success ? checkpointParse.data : { updated_after: '' };

        const meResponse = await nango.get({
            // https://start.exactonline.fr/docs/en-us/api/v1/current/Me
            endpoint: '/api/v1/current/Me',
            retries: 3
        });
        const meData = MeResponseSchema.parse(meResponse.data);
        const meResult = meData.d.results[0];
        if (meResult === undefined) {
            throw new Error('No results in current/Me response');
        }
        const division = meResult.CurrentDivision;

        const proxyConfig: ProxyConfiguration = {
            // https://start.exactonline.fr/docs/en-us/api/v1/financial/GLAccounts
            endpoint: `/api/v1/${encodeURIComponent(String(division))}/financial/GLAccounts`,
            params: {
                $select: 'ID,Code,Description,Modified',
                $orderby: 'Modified asc',
                ...(checkpoint.updated_after && { $filter: `Modified ge datetime'${checkpoint.updated_after}'` })
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'd.__next',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'd.results'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected paginated page to be an array');
            }
            const accounts = page.map((record) => {
                const parsed = GlAccountPageItemSchema.parse(record);
                return {
                    id: parsed.ID,
                    ...(parsed.Code != null && { code: parsed.Code }),
                    ...(parsed.Description != null && { description: parsed.Description }),
                    modified: parsed.Modified
                };
            });

            if (accounts.length === 0) {
                continue;
            }

            await nango.batchSave(accounts, 'GlAccount');

            const lastAccount = accounts[accounts.length - 1];
            if (lastAccount === undefined) {
                continue;
            }

            await nango.saveCheckpoint({
                updated_after: normalizeModified(lastAccount.modified)
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
