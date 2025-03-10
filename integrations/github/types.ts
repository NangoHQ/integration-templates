export interface IssueResponse {
    url: string;
    repository_url: string;
    labels_url: string;
    comments_url: string;
    events_url: string;
    html_url: string;
    id: number;
    node_id: string;
    number: number;
    title: string;
    user: GitHubUser;
    labels: Label[];
    state: string;
    locked: boolean;
    assignee: null | GitHubUser;
    assignees: GitHubUser[];
    milestone: null | Milestone;
    comments: number;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    author_association: string;
    active_lock_reason: string | null;
    body: string;
    closed_by: null | GitHubUser;
    reactions: Reactions;
    timeline_url: string;
    performed_via_github_app: null | GitHubApp;
    state_reason: string | null;
    pull_request?: PullRequest; // Optional because it's only present for PRs
    draft?: boolean; // Optional because it's only present for PRs
}

interface Label {
    id: number;
    node_id: string;
    url: string;
    name: string;
    color: string;
    default: boolean;
    description: string | null;
}

interface Milestone {
    id: number;
    node_id: string;
    url: string;
    html_url: string;
    labels_url: string;
    state: string;
    title: string;
    description: string | null;
    creator: GitHubUser;
    open_issues: number;
    closed_issues: number;
    created_at: string;
    updated_at: string;
    due_on: string | null;
    closed_at: string | null;
}

interface Reactions {
    url: string;
    total_count: number;
    '+1': number;
    '-1': number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
}

interface PullRequest {
    url: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
    merged_at: string | null;
}

interface GitHubApp {
    id: number;
    slug: string;
    node_id: string;
    owner: GitHubUser;
    name: string;
    description: string | null;
    external_url: string;
    html_url: string;
    created_at: string;
    updated_at: string;
    permissions: Record<string, string>;
    events: string[];
}

export interface GitHubUser {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    user_view_type: string;
    site_admin: boolean;
}

interface GitHubReactions {
    url: string;
    total_count: number;
    '+1': number;
    '-1': number;
    laugh: number;
    hooray: number;
    confused: number;
    heart: number;
    rocket: number;
    eyes: number;
}

export interface GithubTimelineResponse {
    url: string;
    html_url: string;
    issue_url: string;
    id: number;
    node_id: string;
    user: GitHubUser;
    created_at: string;
    updated_at: string;
    author_association: string;
    body: string;
    reactions: GitHubReactions;
    performed_via_github_app: GitHubApp | null;
    event: string;
    actor: GitHubUser;
}

export interface ExtendedGitHubUser {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    user_view_type: string;
    site_admin: boolean;
    name: string | null;
    company: string | null;
    blog: string;
    location: string | null;
    email: string | null;
    hireable: boolean | null;
    bio: string | null;
    twitter_username: string | null;
    public_repos: number;
    public_gists: number;
    followers: number;
    following: number;
    created_at: string;
    updated_at: string;
}

export interface GitHubIssueComment {
    id: number;
    node_id: string;
    url: string;
    html_url: string;
    body: string;
    user: GitHubUser;
    created_at: string;
    updated_at: string;
    issue_url: string;
    author_association: string;
}

export interface GitHubIssueCommentResponse {
    url: string;
    html_url: string;
    issue_url: string;
    id: number;
    node_id: string;
    user: GitHubUser;
    created_at: string;
    updated_at: string;
    author_association: string;
    body: string | null;
    reactions: GitHubReactions;
    performed_via_github_app: GitHubApp | null;
}

interface Label {
    id: number;
    node_id: string;
    url: string;
    name: string;
    description: string | null;
    color: string;
    default: boolean;
}

interface Milestone {
    url: string;
    html_url: string;
    labels_url: string;
    id: number;
    node_id: string;
    number: number;
    state: string;
    title: string;
    description: string | null;
    creator: GitHubUser;
    open_issues: number;
    closed_issues: number;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    due_on: string | null;
}

export interface Repository {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    owner: GitHubUser;
    private: boolean;
    html_url: string;
    description: string | null;
    fork: boolean;
    url: string;
    archive_url: string;
    assignees_url: string;
    blobs_url: string;
    branches_url: string;
    collaborators_url: string;
    comments_url: string;
    commits_url: string;
    compare_url: string;
    contents_url: string;
    contributors_url: string;
    deployments_url: string;
    downloads_url: string;
    events_url: string;
    forks_url: string;
    git_commits_url: string;
    git_refs_url: string;
    git_tags_url: string;
    git_url: string;
    issue_comment_url: string;
    issue_events_url: string;
    issues_url: string;
    keys_url: string;
    labels_url: string;
    languages_url: string;
    merges_url: string;
    milestones_url: string;
    notifications_url: string;
    pulls_url: string;
    releases_url: string;
    ssh_url: string;
    stargazers_url: string;
    statuses_url: string;
    subscribers_url: string;
    subscription_url: string;
    tags_url: string;
    teams_url: string;
    trees_url: string;
    clone_url: string;
    mirror_url: string | null;
    hooks_url: string;
    svn_url: string;
    homepage: string | null;
    language: string | null;
    forks_count: number;
    stargazers_count: number;
    watchers_count: number;
    size: number;
    default_branch: string;
    open_issues_count: number;
    is_template: boolean;
    topics: string[];
    has_issues: boolean;
    has_projects: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    has_downloads: boolean;
    archived: boolean;
    disabled: boolean;
    visibility: 'public' | 'private' | 'internal';
    pushed_at: string;
    created_at: string;
    updated_at: string;
    permissions: {
        admin: boolean;
        push: boolean;
        pull: boolean;
    };
    allow_rebase_merge: boolean;
    template_repository: null;
    temp_clone_token: string;
    allow_squash_merge: boolean;
    allow_auto_merge: boolean;
    delete_branch_on_merge: boolean;
    allow_merge_commit: boolean;
    subscribers_count: number;
    network_count: number;
    license: {
        key: string;
        name: string;
        url: string;
        spdx_id: string;
        node_id: string;
        html_url: string;
    };
    forks: number;
    open_issues: number;
    watchers: number;
}

interface Branch {
    label: string;
    ref: string;
    sha: string;
    user: GitHubUser;
    repo: Repository;
}

interface Team {
    id: number;
    node_id: string;
    url: string;
    html_url: string;
    name: string;
    slug: string;
    description: string | null;
    privacy: string;
    permission: string;
    notification_setting: string;
    members_url: string;
    repositories_url: string;
    parent: any;
}

export interface PullRequestResponse {
    url: string;
    id: number;
    node_id: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
    issue_url: string;
    commits_url: string;
    review_comments_url: string;
    review_comment_url: string;
    comments_url: string;
    statuses_url: string;
    number: number;
    state: string;
    locked: boolean;
    title: string;
    user: GitHubUser;
    body: string;
    labels: Label[];
    milestone: Milestone | null;
    active_lock_reason: string | null;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
    merge_commit_sha: string | null;
    assignee: GitHubUser | null;
    assignees: GitHubUser[];
    requested_reviewers: GitHubUser[];
    requested_teams: Team[];
    head: Branch;
    base: Branch;
    _links: Links;
    author_association: 'OWNER' | 'MEMBER' | 'COLLABORATOR' | 'CONTRIBUTOR' | 'FIRST_TIME_CONTRIBUTOR' | 'FIRST_TIMER' | 'NONE';
    auto_merge: any;
    draft: boolean;
}

interface Links {
    self: { href: string };
    html: { href: string };
    issue: { href: string };
    comments: { href: string };
    review_comments: { href: string };
    review_comment: { href: string };
    commits: { href: string };
    statuses: { href: string };
}

export interface PullRequestDetailResponse {
    url: string;
    id: number;
    node_id: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
    issue_url: string;
    number: number;
    state: string;
    locked: boolean;
    title: string;
    user: GitHubUser;
    body: string;
    created_at: string;
    updated_at: string;
    closed_at: null | string;
    merged_at: null | string;
    merge_commit_sha: string;
    assignee: null | GitHubUser;
    assignees: GitHubUser[];
    requested_reviewers: GitHubUser[];
    requested_teams: any[];
    labels: Label[];
    milestone: any;
    draft: boolean;
    commits_url: string;
    review_comments_url: string;
    review_comment_url: string;
    comments_url: string;
    statuses_url: string;
    head: Branch;
    base: Branch;
    _links: Links;
    author_association: string;
    auto_merge: any;
    active_lock_reason: null | string;
    merged: boolean;
    mergeable: boolean;
    rebaseable: boolean;
    mergeable_state: string;
    merged_by: null | GitHubUser;
    comments: number;
    review_comments: number;
    maintainer_can_modify: boolean;
    commits: number;
    additions: number;
    deletions: number;
    changed_files: number;
}

export interface CommitResponse {
    sha: string;
    node_id: string;
    commit: {
        author: {
            name: string;
            email: string;
            date: string;
        } | null;
        committer: {
            name: string;
            email: string;
            date: string;
        };
        message: string;
        tree: {
            sha: string;
            url: string;
        };
        url: string;
        comment_count: number;
        verification: {
            verified: boolean;
            reason: string;
            signature: string | null;
            payload: string | null;
            verified_at?: string;
        };
    };
    url: string;
    html_url: string;
    comments_url: string;
    author: {
        login: string;
        id: number;
        node_id: string;
        avatar_url: string;
        gravatar_id: string;
        url: string;
        html_url: string;
        followers_url: string;
        following_url: string;
        gists_url: string;
        starred_url: string;
        subscriptions_url: string;
        organizations_url: string;
        repos_url: string;
        events_url: string;
        received_events_url: string;
        type: string;
        user_view_type?: string;
        site_admin: boolean;
    };
    committer: {
        login: string;
        id: number;
        node_id: string;
        avatar_url: string;
        gravatar_id: string;
        url: string;
        html_url: string;
        followers_url: string;
        following_url: string;
        gists_url: string;
        starred_url: string;
        subscriptions_url: string;
        organizations_url: string;
        repos_url: string;
        events_url: string;
        received_events_url: string;
        type: string;
        user_view_type?: string;
        site_admin: boolean;
    };
    parents: {
        sha: string;
        url: string;
        html_url: string;
    }[];
}

interface Parent {
    sha: string;
    url: string;
    html_url: string;
}

interface Stats {
    total: number;
    additions: number;
    deletions: number;
}

interface Author {
    name: string;
    email: string;
    date: string;
}

interface Committer {
    name: string;
    email: string;
    date: string;
}

interface Tree {
    sha: string;
    url: string;
}

interface Verification {
    verified: boolean;
    reason: string;
    signature: string;
    payload: string;
    verified_at?: string;
}

interface Commit {
    author: Author;
    committer: Committer;
    message: string;
    tree: Tree;
    url: string;
    comment_count: number;
    verification: Verification;
}

export interface GithubCommitDetailResponse {
    sha: string;
    node_id: string;
    commit: Commit;
    url: string;
    html_url: string;
    comments_url: string;
    author: GitHubUser;
    committer: GitHubUser;
    parents: Parent[];
    stats: Stats;
    files: File[];
}

interface GitCommitAuthor {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    user_view_type: string;
    site_admin: boolean;
}

interface GitCommitVerification {
    verified: boolean;
    reason: string;
    signature: string | null;
    payload: string | null;
}

interface GitCommitParent {
    sha: string;
    url: string;
    html_url: string;
}

interface GitCommit {
    author: GitCommitAuthor;
    committer: GitCommitAuthor;
    message: string;
    tree: Tree;
    url: string;
    comment_count: number;
    verification: GitCommitVerification;
}

export interface GitCommitData {
    sha: string;
    node_id: string;
    commit: GitCommit;
    url: string;
    html_url: string;
    comments_url: string;
    author: GitCommitAuthor;
    committer: GitCommitAuthor;
    parents: GitCommitParent[];
}

interface License {
    key: string;
    name: string;
    spdx_id: string;
    url: string;
    node_id: string;
}

interface Organization {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    user_view_type: string;
    site_admin: boolean;
}

export interface GetRepositoryInfo {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: GitHubUser;
    html_url: string;
    description: string;
    fork: boolean;
    url: string;
    forks_url: string;
    keys_url: string;
    collaborators_url: string;
    teams_url: string;
    hooks_url: string;
    issue_events_url: string;
    events_url: string;
    assignees_url: string;
    branches_url: string;
    tags_url: string;
    blobs_url: string;
    git_tags_url: string;
    git_refs_url: string;
    trees_url: string;
    statuses_url: string;
    languages_url: string;
    stargazers_url: string;
    contributors_url: string;
    subscribers_url: string;
    subscription_url: string;
    commits_url: string;
    git_commits_url: string;
    comments_url: string;
    issue_comment_url: string;
    contents_url: string;
    compare_url: string;
    merges_url: string;
    archive_url: string;
    downloads_url: string;
    issues_url: string;
    pulls_url: string;
    milestones_url: string;
    notifications_url: string;
    labels_url: string;
    releases_url: string;
    deployments_url: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    git_url: string;
    ssh_url: string;
    clone_url: string;
    svn_url: string;
    homepage: string;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string;
    has_issues: boolean;
    has_projects: boolean;
    has_downloads: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    has_discussions: boolean;
    forks_count: number;
    mirror_url: string | null;
    archived: boolean;
    disabled: boolean;
    open_issues_count: number;
    license: License;
    allow_forking: boolean;
    is_template: boolean;
    web_commit_signoff_required: boolean;
    topics: string[];
    visibility: string;
    forks: number;
    open_issues: number;
    watchers: number;
    default_branch: string;
    permissions: any;
    temp_clone_token: string;
    custom_properties: Record<string, unknown>;
    organization: Organization;
    network_count: number;
    subscribers_count: number;
}

export interface Actor {
    id: number;
    login: string;
    display_login: string;
    gravatar_id: string;
    url: string;
    avatar_url: string;
}

interface Repo {
    id: number;
    name: string;
    url: string;
}

interface Organization {
    id: number;
    login: string;
    gravatar_id: string;
    url: string;
    avatar_url: string;
}

export interface EventTypeResponse {
    id: string;
    type: string;
    actor: Actor;
    repo: Repo;
    payload: any;
    public: boolean;
    created_at: string;
    org?: Organization;
}

export interface PullRequestEventPayload {
    action:
        | 'opened'
        | 'closed'
        | 'edited'
        | 'reopened'
        | 'assigned'
        | 'unassigned'
        | 'review_requested'
        | 'review_request_removed'
        | 'labeled'
        | 'unlabeled'
        | 'synchronize';

    number: number;
    pull_request: EventPullRequest;
    changes: {
        body: {
            from: string;
        };
        title: {
            from: string;
        };
    };
    repository: GitHubRepository;
    reason?: string;
}

interface HeadBase {
    label: string;
    ref: string;
    sha: string;
    user: User;
    repo: Repo;
}

export interface PullRequestEventUser {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
}

export interface EventPullRequest {
    url: string;
    id: number;
    node_id: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
    issue_url: string;
    commits_url: string;
    review_comments_url: string;
    review_comment_url: string;
    comments_url: string;
    statuses_url: string;
    number: number;
    state: string;
    locked: boolean;
    title: string;
    user: PullRequestEventUser;
    body: string;
    labels: Label[];
    milestone: Milestone;
    active_lock_reason: string;
    created_at: string;
    updated_at: string;
    closed_at: string;
    merged_at: string;
    merge_commit_sha: string;
    assignee: PullRequestEventUser;
    assignees: PullRequestEventUser[];
    requested_reviewers: PullRequestEventUser[];
    requested_teams: Team[];
    head: HeadBase;
    base: HeadBase;
    _links: Links;
    author_association: string;
    auto_merge: null;
    draft: boolean;
    merged: boolean;
    mergeable: boolean;
    rebaseable: boolean;
    mergeable_state: string;
    merged_by: PullRequestEventUser;
    comments: number;
    review_comments: number;
    maintainer_can_modify: boolean;
    commits: number;
    additions: number;
    deletions: number;
    changed_files: number;
}

export interface GitHubPullRequestResponse {
    url: string;
    id: number;
    node_id: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
    issue_url: string;
    number: number;
    state: string;
    locked: boolean;
    title: string;
    user: GitHubUser;
    body: string;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
    merge_commit_sha: string;
    assignee: GitHubUser | null;
    assignees: GitHubUser[];
    requested_reviewers: GitHubUser[];
    requested_teams: any[];
    labels: GitHubLabel[];
    milestone: any;
    draft: boolean;
    commits_url: string;
    review_comments_url: string;
    review_comment_url: string;
    comments_url: string;
    statuses_url: string;
    head: GitHubPRRef;
    base: GitHubPRRef;
    _links: GitHubPRLinks;
    author_association: string;
    auto_merge: any;
    active_lock_reason: string | null;
}

interface GitHubLabel {
    id: number;
    node_id: string;
    url: string;
    name: string;
    color: string;
    default: boolean;
    description: string;
}

interface GitHubRepository {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: GitHubUser;
    html_url: string;
    description: string;
    fork: boolean;
    url: string;
    forks_url: string;
    keys_url: string;
    collaborators_url: string;
    teams_url: string;
    hooks_url: string;
    issue_events_url: string;
    events_url: string;
    assignees_url: string;
    branches_url: string;
    tags_url: string;
    blobs_url: string;
    git_tags_url: string;
    git_refs_url: string;
    trees_url: string;
    statuses_url: string;
    languages_url: string;
    stargazers_url: string;
    contributors_url: string;
    subscribers_url: string;
    subscription_url: string;
    commits_url: string;
    git_commits_url: string;
    comments_url: string;
    issue_comment_url: string;
    contents_url: string;
    compare_url: string;
    merges_url: string;
    archive_url: string;
    downloads_url: string;
    issues_url: string;
    pulls_url: string;
    milestones_url: string;
    notifications_url: string;
    labels_url: string;
    releases_url: string;
    deployments_url: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    git_url: string;
    ssh_url: string;
    clone_url: string;
    svn_url: string;
    homepage: string;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string;
    has_issues: boolean;
    has_projects: boolean;
    has_downloads: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    has_discussions: boolean;
    forks_count: number;
    mirror_url: string | null;
    archived: boolean;
    disabled: boolean;
    open_issues_count: number;
    license: any;
    allow_forking: boolean;
    is_template: boolean;
    web_commit_signoff_required: boolean;
    topics: string[];
    visibility: string;
    forks: number;
    open_issues: number;
    watchers: number;
    default_branch: string;
}

interface GitHubPRRef {
    label: string;
    ref: string;
    sha: string;
    user: GitHubUser;
    repo: GitHubRepository;
}

interface GitHubPRLinks {
    self: GitHubLink;
    html: GitHubLink;
    issue: GitHubLink;
    comments: GitHubLink;
    review_comments: GitHubLink;
    review_comment: GitHubLink;
    commits: GitHubLink;
    statuses: GitHubLink;
}

interface GitHubLink {
    href: string;
}

export interface DiscussionData {
    repository: {
        discussions: {
            totalCount: number;
            pageInfo: PageInfo;
            edges: {
                cursor: string;
                node: DiscussionNode;
            }[];
        };
    };
}

export interface PageInfo {
    startCursor?: string;
    endCursor: string;
    hasNextPage: boolean;
    hasPreviousPage?: boolean;
}

export interface DiscussionNode {
    id: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    body: string;
    url: string;
    category: DiscussionCategory;
    repository: {
        url: string;
    };
    author: UserFields | null;
    comments: DiscussionComments;
    isAnswered: boolean;
}

export interface DiscussionCategory {
    id: string;
    isAnswerable: boolean;
    name: string;
    slug: string;
    emoji: string;
    description: string;
}

export interface DiscussionAuthor {
    __typename: string;
    id: string;
    login: string;
    name: string | null;
    isHireable: boolean;
    url: string;
    bio: string | null;
    location: string | null;
    avatarUrl: string;
    company: string | null;
}

export interface DiscussionComments {
    totalCount: number;
    pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
    };
    nodes: DiscussionCommentNode[];
}

export interface DiscussionCommentNode {
    id: string;
    body: string;
    createdAt: string;
    author: {
        login: string;
        avatarUrl: string;
        url: string;
    };
    url: string;
    replyTo?: any;
}

export interface GitHubListComment {
    url: string;
    html_url: string;
    issue_url: string;
    id: number;
    node_id: string;
    user: GitHubUser;
    created_at: string;
    updated_at: string;
    author_association: string;
    body: string;
    reactions: GitHubReactions;
    performed_via_github_app: any;
}

export interface DefaultUserDetails {
    hireable: boolean;
    bio: string;
    location: string;
    company: string;
    avatar_url: string;
    html_url: string;
    type: string;
}

export interface DefaultPRDetails {
    additions: number;
    deletions: number;
    changed_files: number;
}

interface Permissions {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
}

export interface RepositoryInfo {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    private: boolean;
    owner: GitHubUser;
    html_url: string;
    description: string | null;
    fork: boolean;
    url: string;
    forks_url: string;
    keys_url: string;
    collaborators_url: string;
    teams_url: string;
    hooks_url: string;
    issue_events_url: string;
    events_url: string;
    assignees_url: string;
    branches_url: string;
    tags_url: string;
    blobs_url: string;
    git_tags_url: string;
    git_refs_url: string;
    trees_url: string;
    statuses_url: string;
    languages_url: string;
    stargazers_url: string;
    contributors_url: string;
    subscribers_url: string;
    subscription_url: string;
    commits_url: string;
    git_commits_url: string;
    comments_url: string;
    issue_comment_url: string;
    contents_url: string;
    compare_url: string;
    merges_url: string;
    archive_url: string;
    downloads_url: string;
    issues_url: string;
    pulls_url: string;
    milestones_url: string;
    notifications_url: string;
    labels_url: string;
    releases_url: string;
    deployments_url: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    git_url: string;
    ssh_url: string;
    clone_url: string;
    svn_url: string;
    homepage: string | null;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string | null;
    has_issues: boolean;
    has_projects: boolean;
    has_downloads: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    has_discussions: boolean;
    forks_count: number;
    mirror_url: string | null;
    archived: boolean;
    disabled: boolean;
    open_issues_count: number;
    license: License | null;
    allow_forking: boolean;
    is_template: boolean;
    web_commit_signoff_required: boolean;
    topics: string[];
    visibility: string;
    forks: number;
    open_issues: number;
    watchers: number;
    default_branch: string;
    permissions: Permissions;
    temp_clone_token: string;
    custom_properties: Record<string, unknown>;
    organization: GitHubUser;
    network_count: number;
    subscribers_count: number;
}

export interface RepositoryStargazersResponse {
    data: {
        repository: {
            url: string;
            stargazers: Stargazers;
        };
    };
}

export interface PullRequestGraphQLResponse {
    data: {
        repository: {
            pullRequests: {
                nodes: PullRequestGQl[];
                pageInfo: PageInfo;
            };
        };
    };
}

export interface PullRequestGQl {
    id: string;
    number: number;
    title: string;
    body: string;
    url: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    mergedAt: string | null;
    state: 'OPEN' | 'CLOSED' | 'MERGED';
    authorAssociation: string;
    labels: {
        nodes: { name: string }[];
    };
    additions: number;
    deletions: number;
    changedFiles: number;
    author: UserFields;
    assignees: any;
    reviewRequests: { nodes: any[] };
    comments: {
        pageInfo: PageInfo;
        edges: CommentNode[];
    };
    reviewThreads: {
        pageInfo: PageInfo;
        hasNextPage: boolean;
        edges: {
            node: ReviewThreadNode;
        }[];
    };
}

export interface CommentNode {
    node: {
        id: string;
        body: string;
        createdAt: string;
        author: UserFields;
    };
}

export interface User {
    id: string;
    login: string;
    avatarUrl: string;
    url: string;
    bio: string | null;
    location: string | null;
    company: string | null;
    isHireable: boolean | null;
    __typename: string;
}

export interface UserFields {
    __typename: string;
    login: string;
    name: string;
    avatarUrl: string;
    url: string;
    bio: string | null;
    company: string | null;
    location: string | null;
    email: string;
    isHireable: boolean;
    websiteUrl: string | null;
    databaseId: number;
}

export interface GraphQLGitHubIssueComment {
    id: string;
    body: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    author: UserFields;
}

export interface GraphQLIssueResponse {
    id: string;
    number: number;
    title: string;
    body: string;
    url: string;
    createdAt: string;
    updatedAt: string;
    state: 'OPEN' | 'CLOSED';
    author: UserFields;
    comments: {
        pageInfo: {
            endCursor: string;
            hasNextPage: boolean;
        };
        edges: {
            node: GraphQLGitHubIssueComment;
        }[];
    };
}

export interface RepositoryIssueResponse {
    data: {
        repository: {
            url: string;
            issues: {
                pageInfo: {
                    hasNextPage: boolean;
                    endCursor: string;
                };
                edges: {
                    node: GraphQLIssueResponse;
                }[];
            };
        };
    };
}

interface Stargazers {
    pageInfo: {
        startCursor: string | null;
        endCursor: string | null;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
    edges: StargazerEdge[];
}

interface StargazerEdge {
    starredAt: string;
    node: StargazerNode;
}

export interface StargazerNode extends UserFields {
    createdAt: string;
    followers: any;
    following: any;
    repositories: any;
}

export interface ForkUser {
    __typename: string;
    id: string;
    login: string;
    name: string | null;
    avatarUrl: string;
    isHireable: boolean;
    url: string;
    bio: string | null;
    company: string | null;
    location: string | null;
    email: string | null;
    websiteUrl: string | null;
}

type Owner = ForkUser;

interface Parent {
    nameWithOwner: string;
    isFork: boolean;
}

interface Node {
    id: string;
    name: string;
    createdAt: string;
    url: string;
    isFork: boolean;
    owner: Owner;
    parent: Parent | null;
}

export interface Edge {
    node: Node;
}

interface Search {
    pageInfo: PageInfo;
    edges: Edge[];
}

export interface ForkGraphqlResponse {
    data: {
        search: Search;
    };
}

export interface ForkGqlResponse {
    data: {
        repository: {
            forks: {
                pageInfo: {
                    endCursor: string | null;
                    hasNextPage: boolean;
                };
                nodes: ForkNode[];
            };
        };
    };
}

export interface ForkNode {
    id: string;
    name: string;
    createdAt: string;
    url: string;
    isFork: boolean;
    isInOrganization: boolean;
    parent: {
        nameWithOwner: string;
        isFork: boolean;
    };
    owner: UserFields;
}

interface CommentNodeGQL {
    id: string;
    body: string;
    createdAt: string;
    author: UserFields;
}

interface CommentEdge {
    node: CommentNodeGQL;
}

interface CommentConnectionGQL {
    pageInfo: PageInfo;
    edges: CommentEdge[];
}

interface PullRequestGQL {
    comments: CommentConnectionGQL;
}

interface RepositoryGQL {
    pullRequest: PullRequestGQL | null;
}

export interface GetCommentsResponseGQL {
    data: {
        repository: RepositoryGQL | null;
    };
}

export interface CommitGQL {
    additions: number;
    deletions: number;
    authoredDate: string;
    parents: {
        totalCount: number;
    };
    id: string;
    oid: string;
    message: string;
    author: {
        user: UserFields;
        email: string;
        name: string;
        date: string;
    };
    url: string;
    associatedPullRequests: {
        nodes: CommitGQLPullRequest[];
    };
}

export interface CommitGQLPullRequest {
    number: number;
    title: string;
    state: string;
    merged: boolean;
    mergedAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
    url: string;
    author: {
        login: string;
    };
    mergedBy?: {
        login: string;
    } | null;
    id: string;
}

interface CommitHistory {
    nodes: CommitGQL[];
    pageInfo: PageInfo;
}

interface DefaultBranchRef {
    name: string;
    target: {
        history: CommitHistory;
    };
}

interface CommitsRepository {
    defaultBranchRef: DefaultBranchRef;
    url: string;
}

interface GetCommitsResponseData {
    repository: CommitsRepository;
}

export interface GetCommitsQLResponse {
    data: GetCommitsResponseData;
    errors?: any[];
}

// Review Thread
export interface ReviewThreadCommentNode {
    id: string;
    body: string;
    createdAt: string;
    author: UserFields;
}

export interface ReviewThreadNode {
    id: string;
    comments: {
        pageInfo: {
            hasNextPage: boolean;
            endCursor?: string;
        };
        edges: {
            node: ReviewThreadCommentNode;
        }[];
    };
}

export interface ReviewThreadsData {
    pageInfo: {
        hasNextPage: boolean;
        endCursor?: string;
    };
    edges: {
        node: ReviewThreadNode;
    }[];
}
export interface GetReviewThreadsResponseGQL {
    data?: {
        repository?: {
            pullRequest?: {
                reviewThreads?: ReviewThreadsData;
            };
        };
    };
}

export interface GetThreadCommentsResponseGQL {
    data?: {
        repository?: {
            pullRequest?: {
                reviewThread?: {
                    id: string;
                    comments: {
                        pageInfo: {
                            hasNextPage: boolean;
                            endCursor?: string;
                        };
                        edges: {
                            node: ReviewThreadCommentNode;
                        }[];
                    };
                };
            };
        };
    };
}
