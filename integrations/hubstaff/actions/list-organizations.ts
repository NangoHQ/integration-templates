import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const OrganizationSchema = z.object({
    id: z.number().describe('Organization ID. Example: 775646'),
    name: z.string().describe("Organization name. Example: Nango'Dev Organization"),
    status: z.string().optional().describe('Organization status. Example: active'),
    created_at: z.string().optional().describe('Creation timestamp. Example: 2024-01-01T00:00:00Z'),
    updated_at: z.string().optional().describe('Last update timestamp. Example: 2024-01-01T00:00:00Z')
});

const OutputSchema = z.object({
    organizations: z.array(OrganizationSchema)
});

const action = createAction({
    description: 'List organizations this account belongs to.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hubstaff:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.hubstaff.com/
            endpoint: 'v2/organizations',
            retries: 3
        });

        const RawResponseSchema = z.union([z.array(z.unknown()), z.object({ organizations: z.array(z.unknown()) }).strict()]);

        const raw = RawResponseSchema.safeParse(response.data);
        if (!raw.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Hubstaff API',
                details: raw.error.issues
            });
        }

        const organizationsArray = Array.isArray(raw.data) ? raw.data : raw.data.organizations;

        const organizations = organizationsArray.map((item: unknown) => {
            const parsed = OrganizationSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Organization schema validation failed',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        return {
            organizations
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
