import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    serviceAccountId: z.string().trim().min(1).describe('Service account ID. Example: "39886536-8f56-11f1-88dd-3619de0c3ef9"'),
    cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(100).optional().describe('Number of items per page. Defaults to 10, max 100.')
});

const RawAccessTokenAttributesSchema = z
    .object({
        name: z.string().nullable().optional(),
        created_at: z.string().nullable().optional(),
        expires_at: z.string().nullable().optional(),
        last4: z.string().nullable().optional(),
        last_used_at: z.string().nullable().optional(),
        public_portion: z.string().nullable().optional(),
        scopes: z.array(z.string()).nullable().optional()
    })
    .passthrough();

const AccessTokenSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: z.object({
        name: z.string().optional(),
        created_at: z.string().optional(),
        expires_at: z.string().optional(),
        last4: z.string().optional(),
        last_used_at: z.string().optional(),
        public_portion: z.string().optional(),
        scopes: z.array(z.string()).optional()
    })
});

const OutputSchema = z.object({
    tokens: z.array(AccessTokenSchema),
    next_cursor: z.string().optional()
});

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

const action = createAction({
    description: 'List access tokens issued to a service account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

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
            // https://docs.datadoghq.com/api/latest/service-accounts/
            endpoint: `v2/service_accounts/${encodeURIComponent(input.serviceAccountId)}/access_tokens`,
            params: {
                'page[size]': String(pageSize),
                'page[number]': String(pageNumber)
            },
            retries: 3
        });

        const rawData = response.data;

        if (!isUnknownRecord(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Datadog API'
            });
        }

        const dataArray = Array.isArray(rawData['data']) ? rawData['data'] : [];

        const tokens = dataArray.map((item: unknown) => {
            if (!isUnknownRecord(item)) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected token shape in response'
                });
            }

            if (typeof item['id'] !== 'string' || typeof item['type'] !== 'string') {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Access token entry is missing a valid id or type'
                });
            }

            const id = item['id'];
            const type = item['type'];
            const rawAttributes = isUnknownRecord(item['attributes']) ? item['attributes'] : {};

            const parsedAttributes = RawAccessTokenAttributesSchema.parse(rawAttributes);

            return AccessTokenSchema.parse({
                id,
                type,
                attributes: {
                    ...(parsedAttributes.name !== undefined && parsedAttributes.name !== null && { name: parsedAttributes.name }),
                    ...(parsedAttributes.created_at !== undefined && parsedAttributes.created_at !== null && { created_at: parsedAttributes.created_at }),
                    ...(parsedAttributes.expires_at !== undefined && parsedAttributes.expires_at !== null && { expires_at: parsedAttributes.expires_at }),
                    ...(parsedAttributes.last4 !== undefined && parsedAttributes.last4 !== null && { last4: parsedAttributes.last4 }),
                    ...(parsedAttributes.last_used_at !== undefined &&
                        parsedAttributes.last_used_at !== null && { last_used_at: parsedAttributes.last_used_at }),
                    ...(parsedAttributes.public_portion !== undefined &&
                        parsedAttributes.public_portion !== null && { public_portion: parsedAttributes.public_portion }),
                    ...(parsedAttributes.scopes !== undefined && parsedAttributes.scopes !== null && { scopes: parsedAttributes.scopes })
                }
            });
        });

        const meta = isUnknownRecord(rawData['meta']) ? rawData['meta'] : undefined;
        const page = meta && isUnknownRecord(meta['page']) ? meta['page'] : undefined;
        const totalFilteredCount = page && typeof page['total_filtered_count'] === 'number' ? page['total_filtered_count'] : undefined;

        let nextCursor: string | undefined;
        if (totalFilteredCount !== undefined) {
            if ((pageNumber + 1) * pageSize < totalFilteredCount) {
                nextCursor = String(pageNumber + 1);
            }
        } else if (tokens.length === pageSize) {
            nextCursor = String(pageNumber + 1);
        }

        const result: z.infer<typeof OutputSchema> = {
            tokens
        };
        if (nextCursor !== undefined) {
            result.next_cursor = nextCursor;
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
