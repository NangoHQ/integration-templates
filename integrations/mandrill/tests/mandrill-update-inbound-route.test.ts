import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-inbound-route.js';

describe('mandrill update-inbound-route tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-inbound-route',
        Model: 'ActionOutput_mandrill_updateinboundroute'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
