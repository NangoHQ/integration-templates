import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of user properties to return in a single page. Defaults to 100.'),
    show_deleted: z.boolean().optional().describe('If true, include deleted user properties in the response.')
});

const UserPropertySchema = z.object({
    user_property: z.string(),
    description: z.string().nullable(),
    type: z.string().nullable(),
    enum_values: z.string().nullable(),
    regex: z.string().nullable(),
    is_array_type: z.boolean(),
    is_hidden: z.boolean(),
    classifications: z.array(z.string()),
    deleted: z.boolean()
});

const OutputSchema = z.object({
    items: z.array(UserPropertySchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List user properties in taxonomy',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://amplitude.com/docs/apis/analytics/taxonomy#get-all-user-properties
        const response = await nango.get({
            endpoint: '/api/2/taxonomy/user-property',
            params: {
                ...(input.show_deleted !== undefined && { showDeleted: String(input.show_deleted) })
            },
            retries: 3
        });

        const rawData = response.data;
        if (rawData === null || typeof rawData !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Amplitude Taxonomy API'
            });
        }

        const envelope = z
            .object({
                success: z.boolean(),
                data: z.array(z.unknown())
            })
            .safeParse(rawData);

        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Amplitude Taxonomy API response envelope'
            });
        }

        if (!envelope.data.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Amplitude Taxonomy API returned success: false'
            });
        }

        const allItems = envelope.data.data.map((item) => {
            const parsed = UserPropertySchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse a user property item'
                });
            }
            return parsed.data;
        });

        const limit = input.limit ?? 100;
        const offset = input.cursor !== undefined ? Number(input.cursor) : 0;
        if (!Number.isInteger(offset) || offset < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Invalid cursor value'
            });
        }

        const pageItems = allItems.slice(offset, offset + limit);
        const nextCursor = offset + limit < allItems.length ? String(offset + limit) : undefined;

        return {
            items: pageItems,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
