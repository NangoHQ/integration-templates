import type { NangoSync, LinearIssue } from '../../models';
import { issueFields } from '../fields/issue.js';
import type { LinearIssueResponse } from '../types';

export default async function fetchData(nango: NangoSync) {
    const { lastSyncDate } = nango;
    const pageSize = 50;
    let after = '';

    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
    while (true) {
        const filterParam = lastSyncDate
            ? `
        , filter: {
            updatedAt: { gte: "${lastSyncDate.toISOString()}" }
        }`
            : '';

        const afterParam = after ? `, after: "${after}"` : '';

        const query = `
        query {
            issues (first: ${pageSize}${afterParam}${filterParam}) {
                nodes {
                    ${issueFields}
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }`;

        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query
            },
            retries: 10
        });

        await nango.batchSave(mapIssues(response.data.data.issues.nodes), 'LinearIssue');

        if (!response.data.data.issues.pageInfo.hasNextPage || !response.data.data.issues.pageInfo.endCursor) {
            break;
        } else {
            after = response.data.data.issues.pageInfo.endCursor;
        }
    }
}

function mapIssues(records: LinearIssueResponse[]): LinearIssue[] {
    return records.map((record: LinearIssueResponse) => {
        return {
            id: record.id,
            assigneeId: record.assignee?.id ? record.assignee.id : null,
            creatorId: record.creator?.id ? record.creator.id : null,
            createdAt: new Date(record.createdAt).toISOString(),
            updatedAt: new Date(record.updatedAt).toISOString(),
            description: record.description,
            dueDate: record.dueDate ? new Date(record.dueDate).toISOString() : null,
            projectId: record.project?.id ? record.project.id : null,
            estimate: record.estimate ? record.estimate.toString() : null,
            teamId: record.team.id,
            title: record.title,
            status: record.state.name
        };
    });
}
