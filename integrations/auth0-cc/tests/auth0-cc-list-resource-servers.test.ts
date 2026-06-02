import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-resource-servers.js';

describe('auth0-cc list-resource-servers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-resource-servers',
        Model: 'ActionOutput_auth0_cc_listresourceservers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
