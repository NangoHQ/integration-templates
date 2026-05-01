import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-issue.js';

describe('jira update-issue tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-issue',
        Model: 'ActionOutput_jira_updateissue'
    });

    // Add mock for getConnection to return cloudId in connection_config
    nangoMock.getConnection = vi.fn().mockResolvedValue({
        connection_config: {
            cloudId: '07779958-e747-4285-ad18-0f5252a97bff',
            baseUrl: 'https://nango-team-test.atlassian.net'
        }
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
