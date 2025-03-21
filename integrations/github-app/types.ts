interface LabelGraphQLResponse {
    name: string;
}

interface UserGraphQLResponse {
    __typename: 'User';
    login: string;
    url: string;
}

interface CommentGraphQLResponse {
    id: string;
    body: string;
    createdAt: string;
    author: UserGraphQLResponse;
}

interface ReviewRequestGraphQLResponse {
    requestedReviewer?: UserGraphQLResponse;
}

interface ReviewGraphQLResponse {
    id: string;
    body: string;
    createdAt: string;
    author: UserGraphQLResponse;
    comments: {
        nodes: CommentGraphQLResponse[];
    };
}

export enum PullRequestState {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    MERGED = 'MERGED'
}

export enum PullRequestReviewDecision {
    APPROVED = 'APPROVED',
    CHANGES_REQUESTED = 'CHANGES_REQUESTED',
    REVIEW_REQUIRED = 'REVIEW_REQUIRED'
}

export interface PullRequestGraphQLResponse {
    id: string;
    url: string;
    title: string;
    state: PullRequestState;
    isDraft: boolean;
    reviewDecision?: PullRequestReviewDecision;
    latestOpinion?: string;
    createdAt: string;
    updatedAt: string;
    body: string;
    assignees: {
        pageInfo: PageInfoGraphQLResponse;
        nodes: UserGraphQLResponse[];
    };
    reviewRequests: {
        pageInfo: PageInfoGraphQLResponse;
        nodes: ReviewRequestGraphQLResponse[];
    };
    labels: {
        pageInfo: PageInfoGraphQLResponse;
        nodes: LabelGraphQLResponse[];
    };
    reviews: {
        nodes: ReviewGraphQLResponse[];
    };
    author: UserGraphQLResponse;
    comments: {
        nodes: CommentGraphQLResponse[];
    };
}

interface PageInfoGraphQLResponse {
    startCursor?: string;
    endCursor?: string;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface PullRequestQueryGraphQLResponse {
    data: {
        repository: {
            pullRequests: {
                pageInfo: PageInfoGraphQLResponse;
                nodes: PullRequestGraphQLResponse[];
            };
        } | null;
    };
}

export interface CommitGraphQLResponse {
    id: string;
    oid: string;
    message: string;
    additions: number;
    deletions: number;
    authoredDate: string;
    url: string;
    parents: {
        totalCount: number;
    };
    author: {
        user?: UserGraphQLResponse | null;
        email?: string;
        name?: string;
    };
}

export interface CommitHistoryGraphQLResponse {
    nodes: CommitGraphQLResponse[];
    pageInfo: PageInfoGraphQLResponse;
}

export interface BranchGraphQLResponse {
    name: string;
    target: {
        history: CommitHistoryGraphQLResponse;
    };
}

export interface RepositoryGraphQLResponse {
    url: string;
    defaultBranchRef?: BranchGraphQLResponse;
    ref?: BranchGraphQLResponse;
}

export interface CommitsQueryGraphQLResponse {
    data: {
        repository: RepositoryGraphQLResponse | null;
    };
}
