/**
 * Builds a SOQL query string for a specified Salesforce object model.
 *
 * @param model - The name of the Salesforce object model (e.g., 'Contact').
 * @param fields - An array of field names to be included in the SELECT clause.
 * @param lastSyncDate - An optional Date object to filter results by LastModifiedDate.
 *                       Only records modified after this date will be returned.
 * @returns A formatted SOQL query string.
 */
export function buildQuery(model: string, fields: string[], lastSyncDate?: Date): string {
    const fieldsString = fields.join(', ');
    let baseQuery = `
    SELECT
    ${fieldsString}
    FROM ${model}
    `;
    if (lastSyncDate) {
        baseQuery += ` WHERE LastModifiedDate > ${lastSyncDate.toISOString()}`;
    }

    return baseQuery;
}