import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-crm-integration.js';

describe('gong-oauth get-crm-integration tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-crm-integration',
        Model: 'ActionOutput_gong_oauth_getcrmintegration'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
