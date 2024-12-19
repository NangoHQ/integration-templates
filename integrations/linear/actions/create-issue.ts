import type { CreateIssue, NangoAction, ProxyConfiguration, LinearIssue } from '../../models.js';
import { createIssueSchema } from '../schema.zod.js';
import { issueFields } from '../fields/issue.js';
import type { LinearCreatedIssue } from '../types';

export default async function runAction(nango: NangoAction, input: CreateIssue): Promise<LinearIssue> {
    const parsedInput = createIssueSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create an issue: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create an issue'
        });
    }

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
        input: parsedInput.data
    };

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
