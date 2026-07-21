import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-inbound-route.js';

describe('mandrill add-inbound-route tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-inbound-route',
        Model: 'ActionOutput_mandrill_addinboundroute'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
