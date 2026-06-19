import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    encodedPostUrn: z.string().describe('Encoded LinkedIn post URN. Example: urn%3Ali%3Ashare%3A12345'),
    commentary: z.string().optional().describe('Updated post commentary/content.'),
    lifecycleState: z.enum(['PUBLISHED', 'DRAFT', 'ARCHIVED']).optional().describe('Updated lifecycle state of the post.')
});

const ProviderResponseSchema = z.object({
    value: z
        .object({
            urn: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    urn: z.string().optional()
});

const action = createAction({
    description: 'Update editable fields on a LinkedIn post.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_organization_social'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const setData: Record<string, unknown> = {};

        if (input.commentary !== undefined) {
            setData['commentary'] = input.commentary;
        }

        if (input.lifecycleState !== undefined) {
            setData['lifecycleState'] = input.lifecycleState;
        }

        if (Object.keys(setData).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field to update (commentary or lifecycleState) must be provided.'
            });
        }

        // https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api
        const response = await nango.post({
            endpoint: `/rest/posts/${input.encodedPostUrn}`,
            headers: {
                'X-RestLi-Method': 'PARTIAL_UPDATE',
                'Linkedin-Version': '202604',
                'X-Restli-Protocol-Version': '2.0.0'
            },
            data: {
                patch: {
                    $set: setData
                }
            },
            retries: 10
        });

        if (response.status !== 200 && response.status !== 204 && response.status !== 201) {
            throw new nango.ActionError({
                type: 'api_error',
                message: `LinkedIn API returned status ${response.status}`,
                status: response.status
            });
        }

        const providerData = ProviderResponseSchema.safeParse(response.data);

        return {
            success: true,
            ...(providerData.success && providerData.data.value?.urn && { urn: providerData.data.value.urn })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
