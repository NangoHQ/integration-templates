import type { BasecampPerson } from ../models.js;

/**
 * Finds a user's ID by their email address within a list of project people.
 *
 * @param email - The email address to search for.
 * @param projectPeople - The list of people in the project.
 * @returns The user ID if found, otherwise undefined.
 */
export function findUserIdByEmail(email: string, projectPeople: BasecampPerson[]): number | undefined {
    const person = projectPeople.find((p) => p.email_address.toLowerCase() === email.toLowerCase());
    return person?.id;
}
