import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-authorization-server-claims.js';

describe('okta list-authorization-server-claims tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-authorization-server-claims',
        Model: 'ActionOutput_okta_cc_listauthorizationserverclaims'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
