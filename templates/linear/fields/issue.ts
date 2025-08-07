export const issueFields = `
    assignee {
        id
        email
        displayName
        avatarUrl
        name
    }
    createdAt
    updatedAt
    creator {
        id
        email
        displayName
        avatarUrl
        name
    }
    description
    dueDate
    estimate
    id
    project {
        id
    }
    team {
        id
    }
    title
    state {
        description
        id
        name
    }
    projectMilestone {
        id
    }
`;
