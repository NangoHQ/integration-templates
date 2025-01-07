import type { Team, Teams } from '../../models.js';
import type { EditMetaField, JiraIssueResponse } from '../types';

/**
 * Finds the team fields in the issue data and returns the team ID and name.
 *
 * @param {any} data - The issue data object.
 * @returns {Teams} - An object containing the list of team IDs and names.
 */
const attlassianTeam = 'com.atlassian.jira.plugin.system.customfieldtypes:atlassian-team';
export function findTeamFields(data: JiraIssueResponse): Teams {
    const teams: Team[] = [];

    const editMetaFields = data.editmeta?.fields || {};

    Object.entries(editMetaFields).forEach(([fieldId, fieldMeta]: [string, any]) => {
        if (isEditMetaField(fieldMeta)) {
            const meta: EditMetaField = fieldMeta;

            if (meta.schema?.configuration?.[attlassianTeam]) {
                const fieldValue = data.fields?.[fieldId];
                if (fieldValue && 'id' in fieldValue && 'name' in fieldValue) {
                    teams.push({
                        id: fieldValue.id,
                        name: fieldValue.name
                    });
                }
            }
        }
    });

    return { teams };
}

function isEditMetaField(fieldMeta: any): fieldMeta is EditMetaField {
    return fieldMeta?.schema?.configuration?.[attlassianTeam] !== undefined;
}
