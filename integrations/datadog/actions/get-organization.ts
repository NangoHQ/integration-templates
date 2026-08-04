import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    publicId: z.string().describe('The public ID of the organization. Example: "dff239f1-89cd-11f1-99ca-2e768c8f2b93"')
});

const ProviderOrgSchema = z
    .object({
        public_id: z.string(),
        name: z.string(),
        description: z.string().nullable().optional(),
        created: z.string().optional(),
        subscription: z.record(z.string(), z.unknown()).optional(),
        billing: z.record(z.string(), z.unknown()).optional(),
        settings: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        public_id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        created: z.string().optional(),
        subscription: z.record(z.string(), z.unknown()).optional(),
        billing: z.record(z.string(), z.unknown()).optional(),
        settings: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get details of a single organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['org_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/organizations/#get-organization
            endpoint: `v1/org/${encodeURIComponent(input.publicId)}`,
            retries: 3
        });

        if (!response.data || !response.data.org) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Organization not found',
                publicId: input.publicId
            });
        }

        const providerOrg = ProviderOrgSchema.parse(response.data.org);

        return {
            public_id: providerOrg.public_id,
            name: providerOrg.name,
            ...(providerOrg.description != null && { description: providerOrg.description }),
            ...(providerOrg.created !== undefined && { created: providerOrg.created }),
            ...(providerOrg.subscription !== undefined && { subscription: providerOrg.subscription }),
            ...(providerOrg.billing !== undefined && { billing: providerOrg.billing }),
            ...(providerOrg.settings !== undefined && { settings: providerOrg.settings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
