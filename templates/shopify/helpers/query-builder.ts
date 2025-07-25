export function buildGraphQLQuery(
    tableName: string,
    topLevelFields: string[],
    paginatedFields: { field: string; fields: string[] }[],
    lastSyncDate?: Date
): string {
    const filterCondition = lastSyncDate ? `query: "updated_at:>'${new Date(lastSyncDate).toISOString()}'"` : '';

    const paginatedQueries = paginatedFields
        .map(({ field, fields }) => {
            return `
                ${field}(first: $${field}First, after: $${field}After) {
                    edges {
                        node {
                            ${fields.join('\n')}
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            `;
        })
        .join('\n');

    return `
        query ($first: Int, $after: String, ${paginatedFields.map(({ field }) => `$${field}First: Int, $${field}After: String`).join(', ')}) {
            ${tableName}(first: $first, after: $after ${filterCondition ? `, ${filterCondition}` : ''}) {
                edges {
                    node {
                        ${topLevelFields.join('\n')}
                        ${paginatedQueries}
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    `;
}
