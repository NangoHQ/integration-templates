import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-attachment.js';

describe('jira add-attachment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-attachment',
        Model: 'ActionOutput_jira_addattachment'
    });

    it('should output the action output that is expected', async () => {
        // Mock getToken for uncontrolledFetch authentication
        (nangoMock as any).getToken = vi.fn().mockResolvedValue({ access_token: 'mocked-token' });

        // Mock uncontrolledFetch to return a successful response matching test.json
        (nangoMock as any).uncontrolledFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve([
                    {
                        id: '10004',
                        self: 'https://api.atlassian.com/ex/jira/07779958-e747-4285-ad18-0f5252a97bff/rest/api/3/attachment/10004',
                        filename: 'test.txt',
                        size: 23,
                        mimeType: 'text/plain',
                        content: 'https://api.atlassian.com/ex/jira/07779958-e747-4285-ad18-0f5252a97bff/rest/api/3/attachment/content/10004'
                    }
                ])
        });

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
