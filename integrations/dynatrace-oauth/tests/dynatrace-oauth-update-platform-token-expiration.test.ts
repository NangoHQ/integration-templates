import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-platform-token-expiration.js';

describe('dynatrace-oauth update-platform-token-expiration tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-platform-token-expiration',
        Model: 'ActionOutput_dynatrace_oauth_updateplatformtokenexpiration'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
