import { createAction } from "nango";
import { createIssueSchema } from '../schema.zod.js';
import { issueFields } from '../fields/issue.js';
import type { LinearCreatedIssue } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { LinearIssue, CreateIssue } from "../models.js";

const action = createAction({
    description: "Create an issue in Linear",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/issues",
        group: "Issues"
    },

    input: CreateIssue,
    output: LinearIssue,
    scopes: ["issues:create"],

    exec: async (nango, input): Promise<LinearIssue> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
