import type { CreateIssue, NangoAction, ProxyConfiguration, LinearIssue } from '../../models.js';
import { createIssueSchema } from '../schema.zod.js';
import { issueFields } from '../fields/issue.js';
import type { LinearCreatedIssue } from '../types';

export default async function runAction(nango: NangoAction, input: CreateIssue): Promise<LinearIssue> {
    nango.zodValidateInput({ zodSchema: createIssueSchema, input });
    delete variables.input.milestoneId;

    const config: ProxyConfiguration = {
        // https://studio.apollographql.com/public/Linear-API/variant/current/explorer
        endpoint: '/graphql',
        data: {
            query,
            variables
        },
        retries: 10
    };

    const response = await nango.post<{ data: LinearCreatedIssue }>(config);

    const { data } = response.data;

    if (!data.issueCreate.success) {
        throw new nango.ActionError({
            message: 'Failed to create issue'
        });
    }

    return data.issueCreate.issue;
}
