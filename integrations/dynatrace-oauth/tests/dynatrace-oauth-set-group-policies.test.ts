import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-group-policies.js';

describe('dynatrace-oauth set-group-policies tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-group-policies',
        Model: 'ActionOutput_dynatrace_oauth_setgrouppolicies'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
