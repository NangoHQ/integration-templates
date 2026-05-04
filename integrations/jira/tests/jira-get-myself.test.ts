import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-myself.js';

describe('jira get-myself tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-myself',
        Model: 'ActionOutput_jira_getmyself'
    });

    it('should output the action output that is expected', async () => {
        // Mock getConnection to return connection_config with cloudId
        nangoMock.getConnection = vi.fn().mockResolvedValue({
            connection_config: {
                cloudId: '07779958-e747-4285-ad18-0f5252a97bff'
            }
        });

        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
