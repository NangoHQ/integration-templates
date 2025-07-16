import type { CreateJiraIssue, CreateIssueFields } from '../types.js';
import type { CreateIssueInput } from '../models.js';

/**
 * Maps the issue data from the input format to the Jira issue structure.
 *
 * @param {CreateIssueInput} input - The issue data input object that needs to be mapped.
 * @returns {CreateJiraIssue} - The mapped Jira issue object.
 */
export function toJiraIssue(input: CreateIssueInput): CreateJiraIssue {
    const fields: CreateIssueFields = {
        summary: input.summary,
        issuetype: { id: input.issueType },
        project: { id: input.project }
    };

    if (input.description) {
        fields.description = {
            version: 1,
            type: 'doc',
            content: [
                {
                    type: 'paragraph',
                    content: [
                        {
                            type: 'text',
                            text: input.description
                        }
                    ]
                }
            ]
        };
    }
    if (input.assignee) {
        fields.assignee = { id: input.assignee };
    }

    if (input.labels && input.labels.length > 0) {
        fields.labels = input.labels;
    }

    return { fields };
}
