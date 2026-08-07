import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-policy-bindings.js';

describe('dynatrace-oauth list-policy-bindings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-policy-bindings',
        Model: 'ActionOutput_dynatrace_oauth_listpolicybindings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
