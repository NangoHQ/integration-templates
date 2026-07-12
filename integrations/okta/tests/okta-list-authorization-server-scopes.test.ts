import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-authorization-server-scopes.js';

describe('okta list-authorization-server-scopes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-authorization-server-scopes',
        Model: 'ActionOutput_okta_cc_listauthorizationserverscopes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
