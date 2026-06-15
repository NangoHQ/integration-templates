import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/register-crm-integration.js';

describe('gong-oauth register-crm-integration tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'register-crm-integration',
        Model: 'ActionOutput_gong_oauth_registercrmintegration'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
