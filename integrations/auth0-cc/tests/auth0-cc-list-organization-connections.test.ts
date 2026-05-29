import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-organization-connections.js';

describe('auth0-cc list-organization-connections tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-organization-connections',
        Model: 'ActionOutput_auth0_cc_listorganizationconnections'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
