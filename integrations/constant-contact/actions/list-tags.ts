import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z
            .number()
            .int()
            .min(1)
            .max(500)
            .optional()
            .describe(
                'Maximum number of tags to return per page, between 1 and 500 (the provider caps the account at 500 tags total). Example: 50. When omitted, the provider default page size of 50 is used.'
            ),
        cursor: z.string().optional().describe('Opaque pagination cursor from the next_cursor field of a previous response. Omit to fetch the first page.')
    })
    .describe('Pagination options for listing contact tags.');

const TagSchema = z.object({
    tag_id: z.string().describe('Unique identifier of the tag. Example: "123e4567-e89b-12d3-a456-426614174000".'),
    name: z.string().describe('Name of the tag. Example: "VIP customers".'),
    created_at: z.string().describe('ISO 8601 timestamp of when the tag was created. Example: "2026-01-15T10:30:00Z".'),
    updated_at: z.string().describe('ISO 8601 timestamp of when the tag was last updated. Example: "2026-01-20T08:45:00Z".')
});

const OutputSchema = z
    .object({
        tags: z.array(TagSchema).describe('The contact tags contained in this page.'),
        next_cursor: z.string().optional().describe('Opaque cursor to pass as the cursor input to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A page of contact tags.');

const ProviderTagSchema = z.object({
    tag_id: z.string(),
    name: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    tags: z.array(ProviderTagSchema),
    _links: z
        .object({
            next: z
                .object({
                    href: z.string()
                })
                .optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Only reads contact tags from the provider; it creates, updates, or deletes nothing.
 */
const action = createAction({
    description: 'List contact tags.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: '/v3/contact_tags',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);

        let next_cursor: string | undefined;
        const nextHref = parsed._links?.next?.href;
        if (nextHref) {
            const queryStart = nextHref.indexOf('?');
            if (queryStart >= 0) {
                const cursorParam = new URLSearchParams(nextHref.slice(queryStart + 1)).get('cursor');
                if (cursorParam) {
                    next_cursor = cursorParam;
                }
            }
        }

        return {
            tags: parsed.tags.map((tag) => ({
                tag_id: tag.tag_id,
                name: tag.name,
                created_at: tag.created_at,
                updated_at: tag.updated_at
            })),
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
