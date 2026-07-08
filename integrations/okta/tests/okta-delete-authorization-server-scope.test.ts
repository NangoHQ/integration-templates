import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-authorization-server-scope.js';

describe('okta delete-authorization-server-scope tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-authorization-server-scope',
        Model: 'ActionOutput_okta_cc_deleteauthorizationserverscope'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
