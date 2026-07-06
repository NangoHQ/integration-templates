import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().optional().describe('Email address of the profile. Example: "user@example.com"'),
    phone_number: z.string().optional().describe('Phone number of the profile. Example: "+1234567890"'),
    first_name: z.string().optional().describe('First name of the profile. Example: "John"'),
    last_name: z.string().optional().describe('Last name of the profile. Example: "Doe"'),
    external_id: z.string().optional().describe('External ID of the profile. Example: "user-123"'),
    properties: z.record(z.string(), z.unknown()).optional().describe('Custom properties for the profile.')
});

const ProviderProfileResponseSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z
            .object({
                email: z.string().nullable().optional(),
                phone_number: z.string().nullable().optional(),
                first_name: z.string().nullable().optional(),
                last_name: z.string().nullable().optional(),
                external_id: z.string().nullable().optional()
            })
            .passthrough()
    })
});

function extractDuplicateProfileId(errorData: unknown): string | undefined {
    const topLevelMeta = z
        .object({
            meta: z.object({
                duplicate_profile_id: z.string()
            })
        })
        .safeParse(errorData);

    if (topLevelMeta.success) {
        return topLevelMeta.data.meta.duplicate_profile_id;
    }

    const errorArrayMeta = z
        .object({
            errors: z
                .array(
                    z.object({
                        meta: z.object({
                            duplicate_profile_id: z.string()
                        })
                    })
                )
                .min(1)
        })
        .safeParse(errorData);

    if (errorArrayMeta.success) {
        for (const errorItem of errorArrayMeta.data.errors) {
            return errorItem.meta.duplicate_profile_id;
        }
    }

    return undefined;
}

const OutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    phone_number: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    external_id: z.string().optional()
});

const action = createAction({
    description: 'Create a profile.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['profiles:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.email && !input.phone_number && !input.external_id) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of email, phone_number, or external_id is required.'
            });
        }

        const requestBody = {
            data: {
                type: 'profile',
                attributes: {
                    ...(input.email !== undefined && { email: input.email }),
                    ...(input.phone_number !== undefined && { phone_number: input.phone_number }),
                    ...(input.first_name !== undefined && { first_name: input.first_name }),
                    ...(input.last_name !== undefined && { last_name: input.last_name }),
                    ...(input.external_id !== undefined && { external_id: input.external_id }),
                    ...(input.properties !== undefined && { properties: input.properties })
                }
            }
        };

        let createResponse;
        // @allowTryCatch Klaviyo returns 409 duplicate_profile when a profile already exists.
        // We catch the 409 and PATCH the existing profile so the action succeeds idempotently.
        try {
            // https://developers.klaviyo.com/en/reference/create_profile
            createResponse = await nango.post({
                endpoint: '/api/profiles',
                data: requestBody,
                headers: {
                    revision: '2026-04-15'
                },
                retries: 0 // eslint-disable-line @nangohq/custom-integrations-linting/proxy-call-retries
            });
        } catch (error: unknown) {
            const errorWithResponse = z
                .object({
                    response: z.object({
                        status: z.number(),
                        data: z.unknown()
                    })
                })
                .safeParse(error);

            const errorData = errorWithResponse.success ? errorWithResponse.data.response.data : error;
            const errorStatus = errorWithResponse.success ? errorWithResponse.data.response.status : undefined;

            if (errorStatus !== 409) {
                throw error;
            }

            const duplicateId = extractDuplicateProfileId(errorData);
            if (!duplicateId) {
                throw new nango.ActionError({
                    type: 'duplicate_profile_error',
                    message: 'Profile already exists but duplicate_profile_id was not returned.',
                    data: errorData
                });
            }

            const patchBody = {
                data: {
                    type: 'profile',
                    id: duplicateId,
                    attributes: requestBody.data.attributes
                }
            };

            // https://developers.klaviyo.com/en/reference/update_profile
            const patchResponse = await nango.patch({
                endpoint: `/api/profiles/${encodeURIComponent(duplicateId)}`,
                data: patchBody,
                headers: {
                    revision: '2026-04-15'
                },
                retries: 0 // eslint-disable-line @nangohq/custom-integrations-linting/proxy-call-retries
            });

            const patchedProfile = ProviderProfileResponseSchema.parse(patchResponse.data);

            return {
                id: patchedProfile.data.id,
                ...(patchedProfile.data.attributes.email != null && { email: patchedProfile.data.attributes.email }),
                ...(patchedProfile.data.attributes.phone_number != null && { phone_number: patchedProfile.data.attributes.phone_number }),
                ...(patchedProfile.data.attributes.first_name != null && { first_name: patchedProfile.data.attributes.first_name }),
                ...(patchedProfile.data.attributes.last_name != null && { last_name: patchedProfile.data.attributes.last_name }),
                ...(patchedProfile.data.attributes.external_id != null && { external_id: patchedProfile.data.attributes.external_id })
            };
        }

        const profile = ProviderProfileResponseSchema.parse(createResponse.data);

        return {
            id: profile.data.id,
            ...(profile.data.attributes.email != null && { email: profile.data.attributes.email }),
            ...(profile.data.attributes.phone_number != null && { phone_number: profile.data.attributes.phone_number }),
            ...(profile.data.attributes.first_name != null && { first_name: profile.data.attributes.first_name }),
            ...(profile.data.attributes.last_name != null && { last_name: profile.data.attributes.last_name }),
            ...(profile.data.attributes.external_id != null && { external_id: profile.data.attributes.external_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
