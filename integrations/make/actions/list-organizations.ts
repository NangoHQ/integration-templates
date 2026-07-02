import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const OrganizationSchema = z
    .object({
        id: z.number().describe('Organization ID. Example: 8242280'),
        name: z.string().describe('Organization name. Example: "My Organization"'),
        timezoneId: z.number().describe('Timezone ID. Example: 1'),
        zone: z.string().describe('Regional hostname. Example: "eu1.make.com"')
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
    pg: PgSchema.optional()
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

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.make.com/api-documentation/api-reference/organizations.md
        const response = await nango.get({
            endpoint: '/organizations',
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

        return {
            organizations,
            ...(pg !== undefined && { pg })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
