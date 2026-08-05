import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(100).optional().describe('Number of items per page. Defaults to 10, max 100.')
});

const ApplicationKeySchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    created_at: z.string().optional(),
    last4: z.string().optional(),
    last_used_at: z.string().nullable().optional(),
    scopes: z.array(z.string()).optional(),
    owned_by: z
        .object({
            id: z.string(),
            type: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(ApplicationKeySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List application keys for this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org_app_keys_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageSize = input.page_size ?? 10;
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid integer page number'
            });
        }
        const pageNumber = input.cursor ? parseInt(input.cursor, 10) : 0;

        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/key-management/#get-all-application-keys
            endpoint: 'v2/application_keys',
            params: {
                'page[size]': String(pageSize),
                'page[number]': String(pageNumber)
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown()).default([]),
                meta: z
                    .object({
                        page: z
                            .object({
                                total_filtered_count: z.number().optional()
                            })
                            .optional()
                    })
                    .optional()
            })
            .parse(response.data);

        const items = providerResponse.data.map((item: unknown) => {
            const key = z
                .object({
                    id: z.string(),
                    type: z.string(),
                    attributes: z
                        .object({
                            name: z.string().optional(),
                            created_at: z.string().optional(),
                            last4: z.string().optional(),
                            last_used_at: z.string().nullable().optional(),
                            scopes: z.array(z.string()).nullable().optional()
                        })
                        .optional(),
                    relationships: z
                        .object({
                            owned_by: z
                                .object({
                                    data: z
                                        .object({
                                            id: z.string(),
                                            type: z.string()
                                        })
                                        .optional()
                                })
                                .optional()
                        })
                        .optional()
                })
                .parse(item);

            const mapped: z.infer<typeof ApplicationKeySchema> = {
                id: key.id,
                type: key.type
            };

            if (key.attributes?.name !== undefined) {
                mapped.name = key.attributes.name;
            }
            if (key.attributes?.created_at !== undefined) {
                mapped.created_at = key.attributes.created_at;
            }
            if (key.attributes?.last4 !== undefined) {
                mapped.last4 = key.attributes.last4;
            }
            if (key.attributes?.last_used_at !== undefined) {
                mapped.last_used_at = key.attributes.last_used_at;
            }
            if (key.attributes?.scopes != null) {
                mapped.scopes = key.attributes.scopes;
            }
            if (key.relationships?.owned_by?.data !== undefined) {
                mapped.owned_by = key.relationships.owned_by.data;
            }

            return mapped;
        });

        let nextCursor: string | undefined;
        const totalFiltered = providerResponse.meta?.page?.total_filtered_count;
        if (totalFiltered !== undefined) {
            if ((pageNumber + 1) * pageSize < totalFiltered) {
                nextCursor = String(pageNumber + 1);
            }
        } else if (items.length === pageSize) {
            nextCursor = String(pageNumber + 1);
        }

        const result: z.infer<typeof OutputSchema> = {
            items
        };
        if (nextCursor !== undefined) {
            result.next_cursor = nextCursor;
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
