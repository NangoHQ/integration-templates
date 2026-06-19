import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Organization ID. Example: "6a26ebb15b58213488fb7401"'),
    displayName: z.string().optional().describe('Display name of the organization'),
    desc: z.string().optional().describe('Description of the organization'),
    name: z.string().optional().describe('Short name of the organization'),
    website: z.string().optional().describe('Website URL of the organization')
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    displayName: z.string().optional().nullable(),
    desc: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
    url: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    desc: z.string().optional(),
    website: z.string().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Update a Trello organization (workspace).',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.atlassian.com/cloud/trello/rest/api-group-organizations/#api-organizations-id-put
        const response = await nango.put({
            endpoint: `/1/organizations/${encodeURIComponent(input.id)}`,
            data: {
                ...(input.displayName !== undefined && { displayName: input.displayName }),
                ...(input.desc !== undefined && { desc: input.desc }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.website !== undefined && { website: input.website })
            },
            retries: 3
        });

        const providerOrg = ProviderOrganizationSchema.parse(response.data);

        return {
            id: providerOrg.id,
            ...(providerOrg.name != null && { name: providerOrg.name }),
            ...(providerOrg.displayName != null && { displayName: providerOrg.displayName }),
            ...(providerOrg.desc != null && { desc: providerOrg.desc }),
            ...(providerOrg.website != null && { website: providerOrg.website }),
            ...(providerOrg.url != null && { url: providerOrg.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
