import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-physical-card.js';

describe('ramp update-physical-card tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-physical-card',
        Model: 'ActionOutput_ramp_updatephysicalcard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
