import type { LinearIssue } from '../models.js';

export interface LinearCreatedIssue {
    issueCreate: {
        success: boolean;
        issue: LinearIssue;
    };
}
