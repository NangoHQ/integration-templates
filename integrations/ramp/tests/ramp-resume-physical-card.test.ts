import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/resume-physical-card.js';

describe('ramp resume-physical-card tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'resume-physical-card',
        Model: 'ActionOutput_ramp_resumephysicalcard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
