import type { JiraIssueResponse } from '../types';
import type { Team as JiraTeam } from '../../models';

export function extractTeamsFromIssues(issues: JiraIssueResponse[]): Map<string, JiraTeam> {
    const uniqueTeams = new Map<string, JiraTeam>();
    const attlassianTeam = 'com.atlassian.jira.plugin.system.customfieldtypes:atlassian-team';

    for (const issue of issues) {
        if (!issue.editmeta?.fields) continue;

        Object.entries(issue.editmeta.fields).forEach(([fieldId, fieldMeta]) => {
            const meta = fieldMeta;
            if (!meta.schema?.configuration?.[attlassianTeam]) {
                return;
            }

            const fieldValue = issue.fields?.[fieldId];
            if (fieldValue && 'id' in fieldValue && 'name' in fieldValue) {
                uniqueTeams.set(fieldValue.id, {
                    id: fieldValue.id,
                    name: fieldValue.name
                });
            }
        });
    }

    return uniqueTeams;
}
