import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-crm-request-status.js';

describe('gong-oauth get-crm-request-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-crm-request-status',
        Model: 'ActionOutput_gong_oauth_getcrmrequeststatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
