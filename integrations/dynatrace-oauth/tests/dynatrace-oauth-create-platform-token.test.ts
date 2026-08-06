import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-platform-token.js';

describe('dynatrace-oauth create-platform-token tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-platform-token',
        Model: 'ActionOutput_dynatrace_oauth_createplatformtoken'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
