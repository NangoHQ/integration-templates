import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-funnel-analysis.js';

describe('amplitude get-funnel-analysis tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-funnel-analysis',
        Model: 'ActionOutput_amplitude_getfunnelanalysis'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
