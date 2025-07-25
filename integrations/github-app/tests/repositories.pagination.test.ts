import { describe, expect, test } from 'vitest';
import type { Repository, RepoResponse } from '../.nango/schema.js';
import type { NangoSync } from '../../models.js';
import runAction from '../actions/repositories.js';

interface GithubProxyConfig {
    endpoint: string;
    paginate: {
        limit: number;
        response_path: string;
        type: 'offset';
        offset_name_in_request: string;
        offset_calculation_method: 'per-page';
        offset_start_value: number;
    };
}

describe('GitHub App Repositories Pagination', () => {
    test('handles offset-based pagination configuration correctly', async () => {
        const mockRepos: Repository[] = [
            {
                id: 1,
                name: 'repo1',
                full_name: 'org/repo1',
                description: 'Test repo 1',
                private: false,
                fork: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                pushed_at: '2024-01-02T00:00:00Z',
                size: 1000,
                stargazers_count: 10,
                watchers_count: 5,
                language: 'TypeScript',
                has_issues: true,
                has_projects: true,
                has_downloads: true,
                has_wiki: true,
                has_pages: false,
                has_discussions: true,
                forks_count: 2,
                archived: false,
                disabled: false,
                open_issues_count: 5,
                allow_forking: true,
                is_template: false,
                web_commit_signoff_required: false,
                topics: ['api', 'integration'],
                visibility: 'public',
                default_branch: 'main',
                permissions: {
                    admin: true,
                    maintain: true,
                    push: true,
                    triage: true,
                    pull: true
                },
                // Required by Repository type
                archive_url: '',
                assignees_url: '',
                blobs_url: '',
                branches_url: '',
                clone_url: '',
                collaborators_url: '',
                comments_url: '',
                commits_url: '',
                compare_url: '',
                contents_url: '',
                contributors_url: '',
                deployments_url: '',
                downloads_url: '',
                events_url: '',
                forks: 2,
                forks_url: '',
                git_commits_url: '',
                git_refs_url: '',
                git_tags_url: '',
                git_url: '',
                homepage: null,
                hooks_url: '',
                html_url: '',
                issue_comment_url: '',
                issue_events_url: '',
                issues_url: '',
                keys_url: '',
                labels_url: '',
                languages_url: '',
                license: null,
                merges_url: '',
                milestones_url: '',
                mirror_url: null,
                node_id: '',
                notifications_url: '',
                open_issues: 5,
                owner: {
                    avatar_url: '',
                    events_url: '',
                    followers_url: '',
                    following_url: '',
                    gists_url: '',
                    gravatar_id: '',
                    html_url: '',
                    id: 1,
                    login: 'org',
                    node_id: '',
                    organizations_url: '',
                    received_events_url: '',
                    repos_url: '',
                    site_admin: false,
                    starred_url: '',
                    subscriptions_url: '',
                    type: 'Organization',
                    url: ''
                },
                pulls_url: '',
                releases_url: '',
                ssh_url: '',
                stargazers_url: '',
                statuses_url: '',
                subscribers_url: '',
                subscription_url: '',
                svn_url: '',
                tags_url: '',
                teams_url: '',
                trees_url: '',
                url: '',
                watchers: 5
            },
            {
                id: 2,
                name: 'repo2',
                full_name: 'org/repo2',
                description: 'Test repo 2',
                private: true,
                fork: false,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-02T00:00:00Z',
                pushed_at: '2024-01-02T00:00:00Z',
                size: 2000,
                stargazers_count: 20,
                watchers_count: 10,
                language: 'JavaScript',
                has_issues: true,
                has_projects: true,
                has_downloads: true,
                has_wiki: true,
                has_pages: true,
                has_discussions: false,
                forks_count: 5,
                archived: false,
                disabled: false,
                open_issues_count: 10,
                allow_forking: true,
                is_template: false,
                web_commit_signoff_required: true,
                topics: ['web', 'frontend'],
                visibility: 'private',
                default_branch: 'main',
                permissions: {
                    admin: true,
                    maintain: true,
                    push: true,
                    triage: true,
                    pull: true
                },
                // Required by Repository type
                archive_url: '',
                assignees_url: '',
                blobs_url: '',
                branches_url: '',
                clone_url: '',
                collaborators_url: '',
                comments_url: '',
                commits_url: '',
                compare_url: '',
                contents_url: '',
                contributors_url: '',
                deployments_url: '',
                downloads_url: '',
                events_url: '',
                forks: 5,
                forks_url: '',
                git_commits_url: '',
                git_refs_url: '',
                git_tags_url: '',
                git_url: '',
                homepage: null,
                hooks_url: '',
                html_url: '',
                issue_comment_url: '',
                issue_events_url: '',
                issues_url: '',
                keys_url: '',
                labels_url: '',
                languages_url: '',
                license: null,
                merges_url: '',
                milestones_url: '',
                mirror_url: null,
                node_id: '',
                notifications_url: '',
                open_issues: 10,
                owner: {
                    avatar_url: '',
                    events_url: '',
                    followers_url: '',
                    following_url: '',
                    gists_url: '',
                    gravatar_id: '',
                    html_url: '',
                    id: 1,
                    login: 'org',
                    node_id: '',
                    organizations_url: '',
                    received_events_url: '',
                    repos_url: '',
                    site_admin: false,
                    starred_url: '',
                    subscriptions_url: '',
                    type: 'Organization',
                    url: ''
                },
                pulls_url: '',
                releases_url: '',
                ssh_url: '',
                stargazers_url: '',
                statuses_url: '',
                subscribers_url: '',
                subscription_url: '',
                svn_url: '',
                tags_url: '',
                teams_url: '',
                trees_url: '',
                url: '',
                watchers: 10
            }
        ];

        const mockNango = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'repositories',
            Model: 'Repository'
        });

        // Track pagination configuration
        let paginationConfig: any = null;

        // Mock paginate to verify configuration and return pages
        mockNango.paginate.mockImplementation(async function* (config: any) {
            // Capture the pagination configuration on first call
            if (!paginationConfig) {
                paginationConfig = config;
            }

            yield mockRepos;
        });

        const result = await runAction(mockNango);

        // Verify pagination configuration
        expect(paginationConfig).toBeDefined();
        expect(paginationConfig.paginate).toEqual({
            limit: 100,
            response_path: 'repositories',
            type: 'offset',
            offset_name_in_request: 'page',
            offset_start_value: 1,
            offset_calculation_method: 'per-page'
        });

        // Verify endpoint
        expect(paginationConfig.endpoint).toBe('/installation/repositories');

        // Verify all repositories were returned
        expect(result.repositories).toHaveLength(2);
        expect(result.repositories[0].id).toBe(1);
        expect(result.repositories[0].name).toBe('repo1');
        expect(result.repositories[0].visibility).toBe('public');
        expect(result.repositories[1].id).toBe(2);
        expect(result.repositories[1].name).toBe('repo2');
        expect(result.repositories[1].visibility).toBe('private');
    });

    test('handles empty page correctly', async () => {
        const mockNango = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'repositories',
            Model: 'Repository'
        });

        mockNango.paginate.mockImplementation(async function* () {
            yield [];
        });

        const result = await runAction(mockNango);
        expect(result.repositories).toHaveLength(0);
    });

    test('handles pagination error gracefully', async () => {
        const mockNango = new globalThis.vitest.NangoSyncMock({
            dirname: __dirname,
            name: 'repositories',
            Model: 'Repository'
        });

        mockNango.paginate.mockImplementation(async function* () {
            throw new Error('Pagination failed');
        });

        await expect(runAction(mockNango)).rejects.toThrow('Pagination failed');
    });
});
