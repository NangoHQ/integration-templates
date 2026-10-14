import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-card-full-status.js';

describe('ramp-sandbox get-card-full-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-card-full-status',
        Model: 'ActionOutput_ramp_sandbox_getcardfullstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
