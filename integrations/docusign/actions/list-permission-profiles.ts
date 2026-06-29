import { z } from 'zod';
import { createAction } from 'nango';

const PermissionProfileSchema = z.object({
    permissionProfileId: z.string(),
    permissionProfileName: z.string(),
    modifiedDateTime: z.string().optional()
});

const OutputSchema = z.object({
    permissionProfiles: z.array(PermissionProfileSchema)
});

const action = createAction({
    description: 'List all permission profiles for the account.',
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataSchema = z.object({
            accountId: z.string().optional()
        });
        const parsedMetadata = metadataSchema.safeParse(metadata);
        const accountId = parsedMetadata.success ? parsedMetadata.data.accountId : undefined;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'missing_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const response = await nango.get({
            // https://developers.docusign.com/docs/esign-rest-api/reference/accounts/permissionprofiles/getpermissionprofiles/
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/permission_profiles`,
            retries: 3
        });

        const providerResponse = z
            .object({
                permissionProfiles: z
                    .array(
                        z.object({
                            permissionProfileId: z.string().optional(),
                            permissionProfileName: z.string().optional(),
                            modifiedDateTime: z.string().optional()
                        })
                    )
                    .optional()
            })
            .parse(response.data);

        const permissionProfiles = (providerResponse.permissionProfiles ?? []).map((profile) => {
            if (!profile.permissionProfileId) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Permission profile is missing permissionProfileId.'
                });
            }

            if (!profile.permissionProfileName) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Permission profile is missing permissionProfileName.'
                });
            }

            return {
                permissionProfileId: profile.permissionProfileId,
                permissionProfileName: profile.permissionProfileName,
                ...(profile.modifiedDateTime !== undefined && { modifiedDateTime: profile.modifiedDateTime })
            };
        });

        return {
            permissionProfiles
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
