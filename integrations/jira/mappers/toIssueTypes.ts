import type { JiraIssueType } from '../types';
import type { IssueType } from '../../models';

/**
 * Maps an array of JiraIssueType to an array of IssueType objects.
 *
 * @param {JiraIssueType[]} issueTypes - An array of Jira IssueType responses.
 * @returns {IssueType[]} - An array of mapped Issue type objects.
 */
export function toIssueTypes(issueTypes: JiraIssueType[], projectId: string): IssueType[] {
    return issueTypes.map((issueType) => ({
        projectId: projectId,
        id: issueType.id,
        name: issueType.name,
        description: issueType.description ?? null,
        url: issueType.self
    }));
}
