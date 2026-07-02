import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    source_id: z.string().describe('The ID of the profile to merge into the destination. Example: "01KWFX59SDCSCCSF0WVS9D5DFT"'),
    destination_id: z.string().describe('The ID of the profile to keep after the merge. Example: "01KWFX5B2R2JJMQTH7J23ZZ0S1"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({}).passthrough()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    phone_number: z.string().optional(),
    external_id: z.string().optional()
});

const action = createAction({
    description: 'Merge one profile into another.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['profiles:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.klaviyo.com/en/reference/merge_profiles
            endpoint: '/api/profile-merge',
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'profile-merge',
                    id: input.destination_id,
                    relationships: {
                        profiles: {
                            data: [
                                {
                                    type: 'profile',
                                    id: input.source_id
                                }
                            ]
                        }
                    }
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const attributes = providerResponse.data.attributes;

        return {
            id: providerResponse.data.id,
            ...(typeof attributes['email'] === 'string' && { email: attributes['email'] }),
            ...(typeof attributes['phone_number'] === 'string' && { phone_number: attributes['phone_number'] }),
            ...(typeof attributes['external_id'] === 'string' && { external_id: attributes['external_id'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
