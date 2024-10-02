/**
 * Constructs the Jira issue URL in the browser format.
 *
 * @param {string} baseUrl - The base URL of the Jira instance.
 * @param {string} issueKey - The key of the Jira issue.
 * @returns {string} - The web URL for the issue.
 */
export function getWebUrl(baseUrl: string, issueKey: string): string {
    return `${baseUrl}/browse/${issueKey}`;
}
