import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const VendorGroupSchema = z.object({
    VendorGroupId: z.string(),
    Description: z.string().optional().nullable()
});

const OutputSchema = z.object({
    items: z.array(VendorGroupSchema),
    next_cursor: z.string().optional()
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}

const action = createAction({
    description: 'List vendor groups (used as VendorGroupId on vendors).',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageSize = 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(skip) || skip < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative integer representing the $skip value.'
            });
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/VendorGroups',
            params: {
                $top: String(pageSize),
                $skip: String(skip),
                'cross-company': 'true'
            },
            retries: 3
        });

        const rawData = response.data;
        if (!isRecord(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from VendorGroups endpoint.'
            });
        }

        const value = rawData['value'];
        if (!Array.isArray(value)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response value is not an array.'
            });
        }

        const items = value.map((item: unknown) => {
            if (!isRecord(item)) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected item format in VendorGroups response.'
                });
            }
            const parsed = VendorGroupSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Vendor group item failed schema validation.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        const nextLink = rawData['@odata.nextLink'];
        const hasNextPage = typeof nextLink === 'string' && nextLink.length > 0 ? true : items.length === pageSize;

        const next_cursor = hasNextPage ? String(skip + pageSize) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
