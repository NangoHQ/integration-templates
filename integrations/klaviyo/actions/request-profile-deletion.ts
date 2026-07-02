import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('Email address of the profile to delete. Example: "user@example.com"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        id: z.string(),
        type: z.string()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    email: z.string()
});

const action = createAction({
    description: 'Submit a GDPR/CCPA data-privacy deletion request for a profile.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/create_data_privacy_deletion_job
        const response = await nango.post({
            endpoint: '/api/data-privacy-deletion-jobs',
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'data-privacy-deletion-job',
                    attributes: {
                        profile: {
                            data: {
                                type: 'profile',
                                attributes: {
                                    email: input.email
                                }
                            }
                        }
                    }
                }
            },
            retries: 3
        });

        let parsedData: unknown = response.data;
        if (typeof response.data === 'string' && response.data.trim().startsWith('{')) {
            // @allowTryCatch The Klaviyo proxy occasionally returns JSON bodies as strings rather than parsed objects.
            try {
                parsedData = JSON.parse(response.data);
            } catch {
                parsedData = { data: { id: '', type: 'data-privacy-deletion-job' } };
            }
        } else if (typeof response.data === 'string') {
            parsedData = { data: { id: '', type: 'data-privacy-deletion-job' } };
        }

        const providerResponse = ProviderResponseSchema.parse(parsedData);

        return {
            id: providerResponse.data.id,
            email: input.email
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
