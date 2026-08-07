import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-policy.js';

describe('dynatrace-oauth update-policy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-policy',
        Model: 'ActionOutput_dynatrace_oauth_updatepolicy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
