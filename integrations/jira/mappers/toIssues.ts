import type { JiraIssueResponse } from '../types.js';
import type { Comment, Issue } from '../models.js';
import { getWebUrl } from '../helpers/get-web-url.js';

/**
 * Maps an array of JiraIssueResponse to an array of Issue objects.
 *
 * @param {JiraIssueResponse[]} issues - An array of Jira issue responses.
 * @param {string} baseUrl - The base URL of the Jira instance.
 * @returns {Issue[]} - An array of mapped Jira issue objects.
 */
export function toIssues(issues: JiraIssueResponse[], baseUrl: string): Issue[] {
    return issues.map((issue) => {
        const comments: Comment[] = issue.fields.comment.comments.map((comment) => ({
            id: comment.id,
            author: comment.author
                ? {
                      accountId: comment.author.accountId,
                      active: comment.author.active,
                      displayName: comment.author.displayName,
                      emailAddress: comment.author.emailAddress || null
                  }
                : {
                      accountId: null,
                      active: false,
                      displayName: 'unknown',
                      emailAddress: null
                  },
            body: comment.body,
            createdAt: new Date(comment.created).toISOString(),
            updatedAt: new Date(comment.updated).toISOString()
        }));

        return {
            id: issue.id,
            key: issue.key,
            summary: issue.fields.summary,
            issueType: issue.fields.issuetype.name,
            status: issue.fields.status.name,
            url: issue.self,
            assignee: issue.fields.assignee?.emailAddress ?? null,
            projectKey: issue.fields.project.key,
            projectName: issue.fields.project.name,
            projectId: issue.fields.project.id,
            createdAt: new Date(issue.fields.created).toISOString(),
            updatedAt: new Date(issue.fields.updated).toISOString(),
            comments: comments,
            webUrl: getWebUrl(baseUrl, issue.key)
        };
    });
}
