import type { JiraProjectResponse } from '../types.js';
import type { Project } from '../models.js';
import { getWebUrl } from '../helpers/get-web-url.js';

/**
 * Maps an array of JiraProjectResponse to an array of Project objects.
 *
 * @param {JiraProjectResponse[]} projects - An array of Jira project responses.
 * @param {string} baseUrl - The base URL of the Jira instance.
 * @returns {Project[]} - An array of mapped project objects.
 */
export function toProjects(projects: JiraProjectResponse[], baseUrl: string): Project[] {
    return projects.map((project) => ({
        id: project.id,
        key: project.key,
        name: project.name,
        url: project.self,
        projectTypeKey: project.projectTypeKey,
        webUrl: getWebUrl(baseUrl, project.id)
    }));
}
