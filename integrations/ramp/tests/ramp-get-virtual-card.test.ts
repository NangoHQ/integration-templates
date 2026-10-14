import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-virtual-card.js';

describe('ramp get-virtual-card tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-virtual-card',
        Model: 'ActionOutput_ramp_getvirtualcard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
