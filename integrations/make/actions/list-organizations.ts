import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of results per page.')
});

const OrganizationSchema = z
    .object({
        id: z.number().describe('Organization ID. Example: 8242280'),
        name: z.string().describe('Organization name. Example: "My Organization"'),
        timezoneId: z.number().optional().describe('Timezone ID. Example: 1'),
        zone: z.string().optional().describe('Regional hostname. Example: "eu1.make.com"')
    })
    .passthrough();

const PgSchema = z.object({
    last: z.string().optional(),
    showLast: z.boolean().optional(),
    sortBy: z.string().optional(),
    sortDir: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional()
});

const OutputSchema = z.object({
    organizations: z.array(OrganizationSchema),
    pg: PgSchema.optional(),
    nextCursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    organizations: z.array(z.unknown()),
    pg: z.object({}).passthrough().optional()
});

const action = createAction({
    description: "List organizations the API token's user is a member of.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['organizations:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let offset: number | undefined;
        if (input.cursor !== undefined) {
            offset = Number(input.cursor);
            if (!Number.isInteger(offset) || offset < 0) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a valid non-negative integer offset string'
                });
            }
        }

        // https://developers.make.com/api-documentation/api-reference/organizations.md
        const response = await nango.get({
            endpoint: '/organizations',
            params: {
                ...(offset !== undefined && { 'pg[offset]': offset }),
                ...(input.limit !== undefined && { 'pg[limit]': input.limit })
            },
            retries: 3
        });

        const responseParse = ProviderResponseSchema.safeParse(response.data);
        if (!responseParse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Make API.'
            });
        }

        const organizations = responseParse.data.organizations.map((org: unknown) => {
            const orgParse = OrganizationSchema.safeParse(org);
            if (!orgParse.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid organization object in response.'
                });
            }
            return orgParse.data;
        });

        let pg = undefined;
        if (responseParse.data.pg !== undefined) {
            const pgParse = PgSchema.safeParse(responseParse.data.pg);
            if (!pgParse.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid pagination metadata in response.'
                });
            }
            pg = pgParse.data;
        }

        const nextCursor = pg?.limit !== undefined && pg?.offset !== undefined && organizations.length >= pg.limit ? String(pg.offset + pg.limit) : undefined;

        return {
            organizations,
            ...(pg !== undefined && { pg }),
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
