import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('The ID or key of the issue. Example: "PROJ-123" or "10001"'),
    expand: z.enum(['transitions.fields']).optional().describe('Additional fields to expand in the response')
});

const StatusSchema = z.object({
    id: z.string().describe('Status ID'),
    name: z.string().describe('Status name'),
    statusCategory: z
        .object({
            id: z.number(),
            key: z.string(),
            colorName: z.string(),
            name: z.string()
        })
        .optional()
});

const FieldsSchema = z.object({
    description: z.string().optional(),
    hasScreen: z.boolean().optional(),
    isConditional: z.boolean().optional(),
    isGlobal: z.boolean().optional(),
    isInitial: z.boolean().optional()
});

const TransitionSchema = z.object({
    id: z.string().describe('Transition ID'),
    name: z.string().describe('Transition name'),
    to: StatusSchema.describe('The status the transition moves the issue to'),
    fields: z.record(z.string(), FieldsSchema).optional().describe('Fields available during the transition'),
    hasScreen: z.boolean().optional(),
    isConditional: z.boolean().optional(),
    isGlobal: z.boolean().optional(),
    isInitial: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    expand: z.string().optional(),
    transitions: z.array(TransitionSchema)
});

const OutputSchema = z.object({
    transitions: z.array(TransitionSchema).describe('Available workflow transitions for the issue')
});

const action = createAction({
    description: 'List available workflow transitions for a Jira issue',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Get cloudId and baseUrl from connection config, metadata, or accessible-resources endpoint
        let cloudId: string | undefined;
        let baseUrl: string | undefined;

        const connection = await nango.getConnection();

        // Try connection config first
        if (connection.connection_config && typeof connection.connection_config === 'object') {
            const config = connection.connection_config;
            if ('cloudId' in config && typeof config['cloudId'] === 'string') {
                cloudId = config['cloudId'];
            }
            if ('baseUrl' in config && typeof config['baseUrl'] === 'string') {
                baseUrl = config['baseUrl'];
            }
        }

        // If not found, check metadata
        if (!cloudId || !baseUrl) {
            const metadata = await nango.getMetadata<Record<string, string>>();
            if (!cloudId && metadata && typeof metadata['cloudId'] === 'string') {
                cloudId = metadata['cloudId'];
            }
            if (!baseUrl && metadata && typeof metadata['baseUrl'] === 'string') {
                baseUrl = metadata['baseUrl'];
            }
        }

        // If still not found, call accessible-resources endpoint
        if (!cloudId || !baseUrl) {
            // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/#3--retrieve-the-cloudid-for-your-site
            const accessibleResourcesResponse = await nango.get({
                endpoint: 'oauth/token/accessible-resources',
                retries: 3
            });

            const resourcesSchema = z.array(
                z.object({
                    id: z.string(),
                    url: z.string(),
                    name: z.string().optional()
                })
            );

            const resources = resourcesSchema.parse(accessibleResourcesResponse.data);

            if (!resources || resources.length === 0) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Jira resources found for this connection'
                });
            }

            const firstResource = resources[0];
            if (!firstResource) {
                throw new nango.ActionError({
                    type: 'no_accessible_resources',
                    message: 'No accessible Jira resources found for this connection'
                });
            }

            cloudId = firstResource.id;
            baseUrl = firstResource.url;

            // Cache for subsequent runs
            // @ts-expect-error: updateMetadata typing issue - metadata storage
            await nango.updateMetadata({
                cloudId: cloudId,
                baseUrl: baseUrl
            });
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'Unable to determine Jira Cloud ID'
            });
        }

        const params: Record<string, string> = {};
        if (input.expand) {
            params['expand'] = input.expand;
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-transitions-get
        const response = await nango.get({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/transitions`,
            params,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            transitions: providerData.transitions
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
