import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CustomerSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    status: z.string().optional(),
    isSales: z.boolean().optional(),
    isPurchase: z.boolean().optional(),
    isSupplier: z.boolean().optional(),
    modified: z.string()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const MeResponseSchema = z.object({
    d: z.union([
        z.object({
            CurrentDivision: z.union([z.number(), z.string()])
        }),
        z.object({
            results: z.array(
                z.object({
                    CurrentDivision: z.union([z.number(), z.string()])
                })
            )
        })
    ])
});

const ExactAccountSchema = z.object({
    ID: z.string(),
    Name: z.string().optional().nullable(),
    Email: z.string().optional().nullable(),
    Phone: z.string().optional().nullable(),
    Status: z.string().optional().nullable(),
    IsSales: z.boolean().optional().nullable(),
    IsPurchase: z.boolean().optional().nullable(),
    IsSupplier: z.boolean().optional().nullable(),
    Modified: z.string()
});

function parseOdataDate(value: string): string {
    const match = value.match(/^\/Date\((\d+)\)\/$/);
    if (!match) {
        return value;
    }
    return new Date(Number(match[1])).toISOString();
}

const sync = createSync({
    description: 'Sync CRM accounts (customers and suppliers) with incremental updates via Modified timestamp.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Customer: CustomerSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/customers'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint ? checkpoint['updated_after'] : undefined;

        // https://docs.nango.dev/integrations/all/exact-online
        const meResponse = await nango.get({
            // https://docs.nango.dev/integrations/all/exact-online
            endpoint: 'api/v1/current/Me',
            retries: 3
        });

        const parsedMe = MeResponseSchema.parse(meResponse.data);
        const division = 'CurrentDivision' in parsedMe.d ? parsedMe.d.CurrentDivision : parsedMe.d.results[0]?.CurrentDivision;
        if (division == null) {
            throw new Error('Could not resolve CurrentDivision from /api/v1/current/Me');
        }

        // https://docs.nango.dev/integrations/all/exact-online
        const proxyConfig: ProxyConfiguration = {
            // https://docs.nango.dev/integrations/all/exact-online
            endpoint: `api/v1/${encodeURIComponent(String(division))}/crm/Accounts`,
            params: {
                $select: 'ID,Name,Email,Phone,Status,IsSales,IsPurchase,IsSupplier,Modified',
                $orderby: 'Modified asc',
                ...(updatedAfter && { $filter: `Modified ge datetime'${updatedAfter}'` })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'd.results'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected results array in paginated response');
            }

            const accounts = page.map((record) => {
                const raw = ExactAccountSchema.parse(record);

                return {
                    id: raw.ID,
                    ...(raw.Name != null && { name: raw.Name }),
                    ...(raw.Email != null && { email: raw.Email }),
                    ...(raw.Phone != null && { phone: raw.Phone }),
                    ...(raw.Status != null && { status: raw.Status }),
                    ...(raw.IsSales != null && { isSales: raw.IsSales }),
                    ...(raw.IsPurchase != null && { isPurchase: raw.IsPurchase }),
                    ...(raw.IsSupplier != null && { isSupplier: raw.IsSupplier }),
                    modified: raw.Modified
                };
            });

            if (accounts.length === 0) {
                continue;
            }

            await nango.batchSave(accounts, 'Customer');
            const lastAccount = accounts[accounts.length - 1];
            if (lastAccount) {
                await nango.saveCheckpoint({
                    updated_after: parseOdataDate(lastAccount.modified)
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
