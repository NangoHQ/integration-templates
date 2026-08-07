import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-group-policy-bindings.js';

describe('dynatrace-oauth get-group-policy-bindings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-group-policy-bindings',
        Model: 'ActionOutput_dynatrace_oauth_getgrouppolicybindings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
