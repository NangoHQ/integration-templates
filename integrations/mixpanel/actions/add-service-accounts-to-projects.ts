import { z } from 'zod';
import { createAction } from 'nango';

const RoleEnum = z.enum(['owner', 'admin', 'analyst', 'consumer']);

const ProjectAssignmentSchema = z.object({
    id: z.number().describe('The project id to add the service account to. Example: 4040293'),
    role: RoleEnum.describe('The service account role for this project. Example: "analyst"')
});

const InputSchema = z.object({
    organization_id: z.number().optional().describe('Your organization id (eg: 3108968). If omitted, it will be fetched from /api/app/me.'),
    service_account_ids: z.array(z.number()).describe('List of service account ids. Example: [194890]'),
    projects: z.array(ProjectAssignmentSchema).describe('List of project/roles to assign.')
});

const ProviderResponseSchema = z.object({
    status: z.string(),
    error: z.string().optional()
});

const OutputSchema = z.object({
    status: z.string(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Assign service accounts to projects.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;

        if (!organizationId) {
            // https://developer.mixpanel.com/reference/me
            const meResponse = await nango.get({
                endpoint: '/api/app/me',
                retries: 3
            });

            if (!meResponse.data) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'Failed to fetch organization info from /api/app/me.'
                });
            }

            const meData = z
                .object({
                    results: z
                        .object({
                            organizations: z.record(z.string(), z.object({ id: z.number() })).optional()
                        })
                        .optional()
                })
                .parse(meResponse.data);

            const orgsMap = meData.results?.organizations;
            const orgs = orgsMap ? Object.values(orgsMap) : [];
            if (orgs.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_organization',
                    message: 'No organizations found for this service account. Please provide organization_id explicitly.'
                });
            }

            if (orgs.length > 1) {
                throw new nango.ActionError({
                    type: 'missing_organization',
                    message: 'Multiple organizations found for this service account. Please provide organization_id explicitly.'
                });
            }

            const [onlyOrg] = orgs;
            if (!onlyOrg) {
                throw new nango.ActionError({
                    type: 'missing_organization',
                    message: 'No organizations found for this service account. Please provide organization_id explicitly.'
                });
            }

            organizationId = onlyOrg.id;
        }

        // https://developer.mixpanel.com/reference/add-service-accounts-to-projects
        // @allowTryCatch Mixpanel returns 403 when the service account lacks org-level role.
        // We catch the raw HTTP error to surface a structured output matching the provider schema.
        try {
            const response = await nango.post({
                endpoint: `/api/app/organizations/${encodeURIComponent(String(organizationId))}/service-accounts/add-to-project`,
                data: {
                    service_account_ids: input.service_account_ids,
                    projects: input.projects
                },
                retries: 3
            });

            const providerResponse = ProviderResponseSchema.parse(response.data);

            return {
                status: providerResponse.status,
                ...(providerResponse.error !== undefined && { error: providerResponse.error })
            };
        } catch (err) {
            if (err !== null && typeof err === 'object' && 'response' in err) {
                const response = err.response;
                if (response !== null && typeof response === 'object' && 'status' in response) {
                    const status = response.status;
                    if (typeof status === 'number' && status === 403) {
                        let errorMessage = 'Permission denied';
                        if ('data' in response) {
                            const data = response.data;
                            if (data !== null && typeof data === 'object' && 'error' in data) {
                                const msg = data.error;
                                if (typeof msg === 'string') {
                                    errorMessage = msg;
                                }
                            }
                        }

                        return {
                            status: 'error',
                            error: errorMessage
                        };
                    }
                }
            }

            throw err;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
