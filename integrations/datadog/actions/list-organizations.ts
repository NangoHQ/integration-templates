import { z } from 'zod';
import { createAction } from 'nango';

const ProviderOrgSchema = z
    .object({
        name: z.string(),
        public_id: z.string(),
        description: z.string().nullable().optional(),
        created: z.string().nullable().optional(),
        settings: z.unknown().nullable().optional(),
        subscription: z.unknown().nullable().optional(),
        billing: z.unknown().nullable().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    orgs: z.array(ProviderOrgSchema)
});

const OrgSchema = z.object({
    name: z.string(),
    public_id: z.string(),
    description: z.string().optional(),
    created: z.string().optional()
});

const OutputSchema = z.object({
    organizations: z.array(OrgSchema)
});

const action = createAction({
    description: 'List organizations manageable by this account (relevant for multi-org/MSP setups).',
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/organizations/#list-your-managed-organizations
            endpoint: 'v1/org',
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            organizations: providerData.orgs.map((org) => ({
                name: org.name,
                public_id: org.public_id,
                ...(org.description != null && { description: org.description }),
                ...(org.created != null && { created: org.created })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
