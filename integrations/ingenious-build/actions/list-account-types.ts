import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    per_page: z.number().min(1).max(100).optional().describe('Number of items to return per page. Maximum 100.')
});

const AccountTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    permissions: z
        .object({
            resources: z.record(z.string(), z.unknown())
        })
        .passthrough()
        .optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(AccountTypeSchema),
    next_cursor: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    items: z.array(z.unknown()),
    total: z.number(),
    page: z.number(),
    per_page: z.number(),
    first_page_url: z.string().nullable().optional(),
    last_page_url: z.string().nullable().optional(),
    next_page_url: z.string().nullable().optional(),
    prev_page_url: z.string().nullable().optional()
});

const action = createAction({
    description: "List the workspace's account types (permission role templates assigned to employees, e.g. Administrator, Standard).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let page = 1;
        let perPage = input.per_page ?? 20;

        // The page size is encoded in the cursor (rather than relying solely on the page number)
        // so that a caller supplying a different per_page on a follow-up call can't desync the
        // scan and skip or repeat account types.
        if (input.cursor !== undefined) {
            const match = /^(\d+):(\d+)$/.exec(input.cursor);
            const pageStr = match?.[1];
            const perPageStr = match?.[2];
            if (pageStr === undefined || perPageStr === undefined) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
            page = parseInt(pageStr, 10);
            perPage = parseInt(perPageStr, 10);
            if (page < 1) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a value returned by a previous call to this action'
                });
            }
        }

        // https://api.ingenious.build/reference/listaccounttypespub.md
        const response = await nango.get({
            endpoint: '/api/v2/pub/account-types',
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        const items = providerResponse.items.map((item: unknown) => {
            const accountType = AccountTypeSchema.parse(item);
            return {
                id: accountType.id,
                name: accountType.name,
                ...(accountType.permissions !== undefined && { permissions: accountType.permissions }),
                ...(accountType.created_at !== undefined && { created_at: accountType.created_at }),
                ...(accountType.updated_at !== undefined && { updated_at: accountType.updated_at })
            };
        });

        const hasNextPage = providerResponse.next_page_url != null;

        return {
            items,
            ...(hasNextPage && { next_cursor: `${page + 1}:${perPage}` })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
