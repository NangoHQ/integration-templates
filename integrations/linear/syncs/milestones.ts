import type { NangoSync, LinearMilestone } from '../../models.js';

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
            projectMilestones (first: ${pageSize}${afterParam}${filterParam}) {
                nodes {
                 id 
                  name
                  createdAt
                  updatedAt
                  progress
                  description
                  status
                  project {
                    id
                    name
                  }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }`;

        const response = await nango.post({
            baseUrlOverride: 'https://api.linear.app',
            // https://studio.apollographql.com/public/Linear-API/variant/current/explorer
            endpoint: '/graphql',
            data: {
                query: query
            },
            retries: 10
        });

        const { data } = response.data;
        const { projectMilestones } = data;
        const { nodes: milestones } = projectMilestones;

        await nango.batchSave(mapMilestones(milestones), 'LinearMilestone');

        if (!projectMilestones.pageInfo.hasNextPage || !projectMilestones.pageInfo.endCursor) {
            break;
        } else {
            after = projectMilestones.pageInfo.endCursor;
        }
    }
}

function mapMilestones(records: LinearMilestone[]): LinearMilestone[] {
    return records.map((record: LinearMilestone) => {
        return {
            id: record.id,
            name: record.name,
            progress: record.progress,
            description: record.description,
            createdAt: new Date(record.createdAt).toISOString(),
            updatedAt: new Date(record.updatedAt).toISOString(),
            status: record.status,
            project: record.project
        };
    });
}
