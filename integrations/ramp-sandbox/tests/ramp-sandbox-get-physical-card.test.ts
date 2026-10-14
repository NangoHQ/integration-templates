import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-physical-card.js';

describe('ramp-sandbox get-physical-card tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-physical-card',
        Model: 'ActionOutput_ramp_sandbox_getphysicalcard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
