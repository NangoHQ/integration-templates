import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-crm-integration.js';

describe('gong-oauth delete-crm-integration tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-crm-integration',
        Model: 'ActionOutput_gong_oauth_deletecrmintegration'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
