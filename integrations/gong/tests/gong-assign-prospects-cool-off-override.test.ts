import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/assign-prospects-cool-off-override.js';

describe('gong-oauth assign-prospects-cool-off-override tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'assign-prospects-cool-off-override',
        Model: 'ActionOutput_gong_oauth_assignprospectscooloffoverride'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
