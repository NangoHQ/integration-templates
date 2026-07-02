import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    coupon_id: z.string().describe('Coupon ID. Example: "nango_seed_coupon_1"'),
    unique_code: z.string().describe('Unique coupon code to create. Example: "NANGOTESTCODE1"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            unique_code: z.string(),
            expires_at: z.string().optional()
        }),
        relationships: z.object({
            coupon: z.object({
                data: z.object({
                    type: z.string(),
                    id: z.string()
                })
            })
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    coupon_id: z.string(),
    unique_code: z.string(),
    expires_at: z.string().optional()
});

const action = createAction({
    description: 'Create a unique coupon code under a coupon',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['catalogs:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.klaviyo.com/en/reference/create_coupon_code
            endpoint: '/api/coupon-codes',
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'coupon-code',
                    attributes: {
                        unique_code: input.unique_code
                    },
                    relationships: {
                        coupon: {
                            data: {
                                type: 'coupon',
                                id: input.coupon_id
                            }
                        }
                    }
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response shape',
                details: parsed.error.message
            });
        }

        return {
            id: parsed.data.data.id,
            coupon_id: parsed.data.data.relationships.coupon.data.id,
            unique_code: parsed.data.data.attributes.unique_code,
            ...(parsed.data.data.attributes.expires_at !== undefined && {
                expires_at: parsed.data.data.attributes.expires_at
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
