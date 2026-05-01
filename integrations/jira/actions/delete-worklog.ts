import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueIdOrKey: z.string().describe('The ID or key of the issue. Example: "10032" or "PROJ-123"'),
    worklogId: z.string().describe('The ID of the worklog to delete. Example: "10011"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    issueIdOrKey: z.string(),
    worklogId: z.string()
});

const action = createAction({
    description: 'Delete a worklog from a Jira issue.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-worklog',
        group: 'Worklogs'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = connection.connection_config || {};
        let cloudId = connectionConfig['cloudId'];

        if (!cloudId) {
            const metadata = await nango.getMetadata<{ cloudId?: string }>();
            cloudId = metadata?.cloudId;
        }

        if (!cloudId) {
            throw new nango.ActionError({
                type: 'missing_cloud_id',
                message: 'cloudId is required in connection_config or metadata. Please reconnect your Jira account.'
            });
        }

        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-worklogs/#api-rest-api-3-issue-issueidorkey-worklog-id-delete
        await nango.delete({
            endpoint: `/ex/jira/${cloudId}/rest/api/3/issue/${input.issueIdOrKey}/worklog/${input.worklogId}`,
            headers: {
                'X-Atlassian-Token': 'no-check'
            },
            retries: 10
        });

        return {
            success: true,
            issueIdOrKey: input.issueIdOrKey,
            worklogId: input.worklogId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
