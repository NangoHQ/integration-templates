import { NangoSync } from "nango";
/// <reference types="vitest" />
import { describe, it, expect, beforeEach } from 'vitest';

interface GitHubUser {
    id: number;
    login: string;
}

interface GitHubRepository {
    id: number;
    name: string;
    owner: GitHubUser;
    private: boolean;
}

interface GitHubIssue {
    id: number;
    number: number;
    title: string;
    state: string;
    user: GitHubUser;
    body: string;
    created_at: string;
    updated_at: string;
    pull_request?: {
        url: string;
    };
}

interface GithubIssue {
    id: number;
    owner: string;
    repo: string;
    issue_number: number;
    title: string;
    state: string;
    author: string;
    author_id: number;
    body: string | null;
    date_created: string;
    date_last_modified: string;
}

class MockNango {
    private savedIssues: GithubIssue[] = [];
    private currentEndpoint: string = '';
    private repoCount: number = 0;
    private issueCount: number = 0;
    private logMessages: string[] = [];

    async *paginate<T>(config: any): AsyncGenerator<T[]> {
        this.currentEndpoint = config.endpoint;
        console.log('Paginating endpoint:', config.endpoint);

        if (config.endpoint === '/user/repos') {
            console.log('Processing repositories, count:', this.repoCount);
            // Verify repository pagination configuration
            expect(config.paginate.limit).toBe(100);

            if (this.repoCount === 0) {
                // First page of repositories
                const mockRepo1: GitHubRepository = {
                    id: 1,
                    name: 'repo1',
                    owner: {
                        id: 101,
                        login: 'testuser'
                    },
                    private: false
                };

                const mockRepo2: GitHubRepository = {
                    id: 2,
                    name: 'repo2',
                    owner: {
                        id: 101,
                        login: 'testuser'
                    },
                    private: false
                };

                this.repoCount++;
                yield [mockRepo1, mockRepo2] as unknown as T[];
            }
            yield [];
        } else if (config.endpoint.match(/\/repos\/.*\/issues/)) {
            console.log('Processing issues, count:', this.issueCount);
            // Verify issues pagination configuration
            expect(config.paginate.limit).toBe(100);

            const [, owner, repo] = config.endpoint.match(/\/repos\/(.+)\/(.+)\/issues/)!;

            if (this.issueCount === 0) {
                // First page of issues (including a PR to be filtered out)
                const mockIssue1: GitHubIssue = {
                    id: 1001,
                    number: 1,
                    title: 'First Issue',
                    state: 'open',
                    user: {
                        id: 201,
                        login: 'contributor1'
                    },
                    body: 'Issue description',
                    created_at: '2024-03-25T10:00:00Z',
                    updated_at: '2024-03-25T11:00:00Z'
                };

                const mockPR: GitHubIssue = {
                    id: 1002,
                    number: 2,
                    title: 'Test PR',
                    state: 'open',
                    user: {
                        id: 202,
                        login: 'contributor2'
                    },
                    body: 'PR description',
                    created_at: '2024-03-25T12:00:00Z',
                    updated_at: '2024-03-25T13:00:00Z',
                    pull_request: {
                        url: 'https://api.github.com/repos/testuser/repo1/pulls/2'
                    }
                };

                const mockIssue2: GitHubIssue = {
                    id: 1003,
                    number: 3,
                    title: 'Second Issue',
                    state: 'closed',
                    user: {
                        id: 203,
                        login: 'contributor3'
                    },
                    body: 'Another issue',
                    created_at: '2024-03-25T14:00:00Z',
                    updated_at: '2024-03-25T15:00:00Z'
                };

                this.issueCount++;
                yield [mockIssue1, mockPR, mockIssue2] as unknown as T[];
            }
            yield [];
        }
    }

    async batchSave<T>(records: T[], model: string): Promise<void> {
        if (model === 'GithubIssue' && records.length > 0) {
            console.log('Saving issues:', records);
            this.savedIssues = [...this.savedIssues, ...(records as GithubIssue[])];
            console.log('Current saved issues:', this.savedIssues);
        }
    }

    async log(message: string): Promise<void> {
        console.log('Log message:', message);
        this.logMessages.push(message);
    }

    getSavedIssues(): GithubIssue[] {
        return this.savedIssues;
    }

    getLogMessages(): string[] {
        return this.logMessages;
    }

    getCurrentEndpoint(): string {
        return this.currentEndpoint;
    }
}

describe('GitHub Issues Pagination Tests', () => {
    let nango: MockNango;

    beforeEach(() => {
        nango = new MockNango();
    });

    it('should handle nested pagination and filter out PRs', async () => {
        const fetchData = (await import('../syncs/issues')).default;
        await fetchData.exec(nango as unknown as NangoSync);

        const savedIssues = nango.getSavedIssues();
        expect(savedIssues).toHaveLength(2); // Two issues (PR filtered out)

        // Verify first issue
        const firstIssue = savedIssues[0];
        expect(firstIssue).toBeDefined();
        if (firstIssue) {
            expect(firstIssue.id).toBe("1001");
            expect(firstIssue.owner).toBe('testuser');
            expect(firstIssue.repo).toBe('repo1');
            expect(firstIssue.issue_number).toBe(1);
            expect(firstIssue.title).toBe('First Issue');
            expect(firstIssue.state).toBe('open');
            expect(firstIssue.author).toBe('contributor1');
            expect(firstIssue.author_id).toBe(201);
            expect(firstIssue.body).toBe('Issue description');
            expect(firstIssue.date_created).toBe('2024-03-25T10:00:00Z');
            expect(firstIssue.date_last_modified).toBe('2024-03-25T11:00:00Z');
        }

        // Verify second issue
        const secondIssue = savedIssues[1];
        expect(secondIssue).toBeDefined();
        if (secondIssue) {
            expect(secondIssue.id).toBe("1003");
            expect(secondIssue.owner).toBe('testuser');
            expect(secondIssue.repo).toBe('repo1');
            expect(secondIssue.issue_number).toBe(3);
            expect(secondIssue.title).toBe('Second Issue');
            expect(secondIssue.state).toBe('closed');
            expect(secondIssue.author).toBe('contributor3');
            expect(secondIssue.author_id).toBe(203);
            expect(secondIssue.body).toBe('Another issue');
            expect(secondIssue.date_created).toBe('2024-03-25T14:00:00Z');
            expect(secondIssue.date_last_modified).toBe('2024-03-25T15:00:00Z');
        }

        // Verify log messages
        const logMessages = nango.getLogMessages();
        expect(logMessages).toHaveLength(1);
        expect(logMessages[0]).toBe('Sent 2 issues from testuser/repo1');
    });

    it('should handle empty responses at each level', async () => {
        nango.paginate = async function* <T>(config: any): AsyncGenerator<T[]> {
            // Return empty results for all endpoints
            yield [];
        };

        const fetchData = (await import('../syncs/issues')).default;
        await fetchData.exec(nango as unknown as NangoSync);

        const savedIssues = nango.getSavedIssues();
        expect(savedIssues).toHaveLength(0);
    });

    it('should handle pagination errors', async () => {
        nango.paginate = async function* () {
            throw new Error('Pagination failed');
            yield [];
        };

        const fetchData = (await import('../syncs/issues')).default;
        await expect(fetchData.exec(nango as unknown as NangoSync)).rejects.toThrow('Pagination failed');
    });
});
