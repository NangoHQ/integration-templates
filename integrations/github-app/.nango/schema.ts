// ---------------------------
// This file was generated by Nango (v0.61.2)
// You can version this file
// ---------------------------

export interface GithubLicense {
    key: string;
    name: string;
    url: string | null;
    spdx_id: string;
    node_id: string;
    html_url?: string | null;
}

export interface Repository {
    allow_forking: boolean;
    archive_url: string;
    archived: boolean;
    assignees_url: string;
    blobs_url: string;
    branches_url: string;
    clone_url: string;
    collaborators_url: string;
    comments_url: string;
    commits_url: string;
    compare_url: string;
    contents_url: string;
    contributors_url: string;
    created_at: string;
    default_branch: string;
    deployments_url: string;
    description: string | null;
    disabled: boolean;
    downloads_url: string;
    events_url: string;
    fork: boolean;
    forks: number;
    forks_count: number;
    forks_url: string;
    full_name: string;
    git_commits_url: string;
    git_refs_url: string;
    git_tags_url: string;
    git_url: string;
    has_discussions: boolean;
    has_downloads: boolean;
    has_issues: boolean;
    has_pages: boolean;
    has_projects: boolean;
    has_wiki: boolean;
    homepage: string | null;
    hooks_url: string;
    html_url: string;
    id: number;
    is_template: boolean;
    issue_comment_url: string;
    issue_events_url: string;
    issues_url: string;
    keys_url: string;
    labels_url: string;
    language: string | null;
    languages_url: string;
    license: GithubLicense | null;
    merges_url: string;
    milestones_url: string;
    mirror_url: string | null;
    name: string;
    node_id: string;
    notifications_url: string;
    open_issues: number;
    open_issues_count: number;
    owner: {
        avatar_url: string;
        events_url: string;
        followers_url: string;
        following_url: string;
        gists_url: string;
        gravatar_id: string;
        html_url: string;
        id: number;
        login: string;
        node_id: string;
        organizations_url: string;
        received_events_url: string;
        repos_url: string;
        site_admin: boolean;
        starred_url: string;
        subscriptions_url: string;
        type: string;
        url: string;
        user_view_type?: string;
    };
    permissions: { admin: boolean; maintain: boolean; pull: boolean; push: boolean; triage: boolean };
    private: boolean;
    pulls_url: string;
    pushed_at: string;
    releases_url: string;
    size: number;
    ssh_url: string;
    stargazers_count: number;
    stargazers_url: string;
    statuses_url: string;
    subscribers_url: string;
    subscription_url: string;
    svn_url: string;
    tags_url: string;
    teams_url: string;
    topics: string[];
    trees_url: string;
    updated_at: string;
    url: string;
    visibility: string;
    watchers: number;
    watchers_count: number;
    web_commit_signoff_required: boolean;
}

export interface RepoResponse {
    repositories: Repository[];
}

export interface GithubMetadataInput {
    owner: string;
    repo: string;
    syncWindowMinutes?: number;
    branch?: string;
}

export interface GithubUser {
    id: string;
    url?: string;
}

export interface GithubComment {
    id: string;
    body: string;
    user: GithubUser;
    createdAt: string;
}

export interface GithubCommit {
    id: string;
    url: string;
    branch: string;
    author: GithubUser;
    message: string;
    date: string;
}

export interface GithubPullRequest {
    id: string;
    url: string;
    state: string;
    title: string;
    user: GithubUser;
    assignees: GithubUser[];
    reviewers: GithubUser[];
    draft: boolean;
    labels: string[];
    reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED';
    latestComment: GithubComment;
}
