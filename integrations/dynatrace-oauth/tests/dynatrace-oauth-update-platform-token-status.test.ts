import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-platform-token-status.js';

describe('dynatrace-oauth update-platform-token-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-platform-token-status',
        Model: 'ActionOutput_dynatrace_oauth_updateplatformtokenstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
