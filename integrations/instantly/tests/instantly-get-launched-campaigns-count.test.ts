import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-launched-campaigns-count.js';

describe('instantly get-launched-campaigns-count tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-launched-campaigns-count',
        Model: 'ActionOutput_instantly_getlaunchedcampaignscount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
