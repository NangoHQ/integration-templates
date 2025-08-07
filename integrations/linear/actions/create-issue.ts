import type { CreateIssue, NangoAction, ProxyConfiguration, LinearIssue } from '../../models.js';
import { createIssueSchema } from '../schema.zod.js';
import { issueFields } from '../fields/issue.js';
import type { LinearCreatedIssue } from '../types.js';

export default async function runAction(nango: NangoAction, input: CreateIssue): Promise<LinearIssue> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: createIssueSchema, input });

    const query = `
        mutation CreateIssue($input: IssueCreateInput!) {
            issueCreate(input: $input) {
                success
                issue {
                    ${issueFields}
                }
            }
        }
    `;

    const variables = {
        input: {
            ...input,
            ...(parsedInput.data.milestoneId && {
                projectMilestoneId: parsedInput.data.milestoneId
            })
        }
    };
    delete variables.input.milestoneId;

    const config: ProxyConfiguration = {
        // https://studio.apollographql.com/public/Linear-API/variant/current/explorer
        endpoint: '/graphql',
        data: {
            query,
            variables
        },
        retries: 3
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
