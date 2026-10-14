import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/suspend-physical-card.js';

describe('ramp-sandbox suspend-physical-card tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'suspend-physical-card',
        Model: 'ActionOutput_ramp_sandbox_suspendphysicalcard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
