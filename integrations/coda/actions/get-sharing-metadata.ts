import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('Doc ID. Example: "L_hgEASd6n"')
});

const ProviderAclMetadataSchema = z.object({
    canShare: z.boolean(),
    canShareWithWorkspace: z.boolean(),
    canShareWithOrg: z.boolean(),
    canCopy: z.boolean()
});

const OutputSchema = z.object({
    canShare: z.boolean(),
    canShareWithWorkspace: z.boolean(),
    canShareWithOrg: z.boolean(),
    canCopy: z.boolean()
});

const action = createAction({
    description: 'Retrieve sharing capabilities for a doc.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:docs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1#tag/Sharing/operation/getDocAclMetadata
            endpoint: `/docs/${encodeURIComponent(input.docId)}/acl/metadata`,
            retries: 3
        });

        const providerData = ProviderAclMetadataSchema.parse(response.data);

        return {
            canShare: providerData.canShare,
            canShareWithWorkspace: providerData.canShareWithWorkspace,
            canShareWithOrg: providerData.canShareWithOrg,
            canCopy: providerData.canCopy
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
