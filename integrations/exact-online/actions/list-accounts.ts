import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    status: z.enum(['C', 'S', 'A']).optional().describe('Account status filter: C=Customer, S=Supplier, A=Both'),
    limit: z.number().min(1).max(1000).optional().describe('Max records per page (1-1000)'),
    cursor: z.string().optional().describe('Pagination cursor (skip value) from previous response'),
    modified_after: z.string().optional().describe('ISO 8601 date string for incremental sync filter')
});

const MeResponseSchema = z.object({
    d: z
        .object({
            results: z.array(
                z
                    .object({
                        CurrentDivision: z.number().int()
                    })
                    .passthrough()
            )
        })
        .passthrough()
});

const AccountSchema = z.object({
    ID: z.string(),
    Name: z.string().nullable().optional(),
    Code: z.string().nullable().optional(),
    Status: z.string().nullable().optional(),
    IsSales: z.boolean().nullish().optional(),
    IsPurchase: z.boolean().nullish().optional(),
    AddressLine1: z.string().nullable().optional(),
    City: z.string().nullable().optional(),
    Country: z.string().nullable().optional(),
    Email: z.string().nullable().optional(),
    Phone: z.string().nullable().optional(),
    Modified: z.string().nullable().optional()
});

const AccountsResponseSchema = z.object({
    d: z.object({
        results: z.array(z.unknown()),
        __next: z.string().optional()
    })
});

const OutputItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    code: z.string().optional(),
    status: z.string().optional(),
    is_sales: z.boolean().optional(),
    is_purchase: z.boolean().optional(),
    address_line1: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    modified: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List CRM accounts (customers and/or suppliers)',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.Accounts'],
    endpoint: {
        method: 'POST',
        path: '/actions/list-accounts'
    },
    exec: async (nango, input) => {
        const meResponse = await nango.get({
            // https://docs.nango.dev/integrations/all/exact-online
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meData = MeResponseSchema.parse(meResponse.data);
        const firstResult = meData.d.results[0];
        if (!firstResult) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'No results in Me response'
            });
        }
        const division = firstResult.CurrentDivision;

        const filters: string[] = [];
        if (input.status) {
            filters.push(`Status eq '${input.status}'`);
        }
        if (input.modified_after) {
            filters.push(`Modified gt datetime'${input.modified_after}'`);
        }

        const params: Record<string, string | number> = {
            $select: 'ID,Name,Code,Status,IsSales,IsPurchase,AddressLine1,City,Country,Email,Phone,Modified',
            $orderby: 'Modified asc',
            $top: input.limit ?? 1000
        };

        if (filters.length > 0) {
            params['$filter'] = filters.join(' and ');
        }

        if (input.cursor) {
            params['$skip'] = input.cursor;
        }

        const accountsResponse = await nango.get({
            // https://docs.nango.dev/integrations/all/exact-online
            endpoint: `/api/v1/${encodeURIComponent(String(division))}/crm/Accounts`,
            params,
            retries: 3
        });

        const accountsData = AccountsResponseSchema.parse(accountsResponse.data);
        const results = accountsData.d.results;

        const items = results.map((item: unknown) => {
            const account = AccountSchema.parse(item);
            return {
                id: account.ID,
                ...(account.Name != null && account.Name !== '' && { name: account.Name }),
                ...(account.Code != null && account.Code !== '' && { code: account.Code }),
                ...(account.Status != null && account.Status !== '' && { status: account.Status }),
                ...(account.IsSales != null && { is_sales: account.IsSales }),
                ...(account.IsPurchase != null && { is_purchase: account.IsPurchase }),
                ...(account.AddressLine1 != null && account.AddressLine1 !== '' && { address_line1: account.AddressLine1 }),
                ...(account.City != null && account.City !== '' && { city: account.City }),
                ...(account.Country != null && account.Country !== '' && { country: account.Country }),
                ...(account.Email != null && account.Email !== '' && { email: account.Email }),
                ...(account.Phone != null && account.Phone !== '' && { phone: account.Phone }),
                ...(account.Modified != null && account.Modified !== '' && { modified: account.Modified })
            };
        });

        let nextCursor: string | undefined;
        if (accountsData.d.__next) {
            const skipMatch = accountsData.d.__next.match(/[?&]$skip=([^&]+)/);
            if (skipMatch && skipMatch[1]) {
                nextCursor = decodeURIComponent(skipMatch[1]);
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
