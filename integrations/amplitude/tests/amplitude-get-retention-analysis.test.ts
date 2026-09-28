import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-retention-analysis.js';

describe('amplitude get-retention-analysis tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-retention-analysis',
        Model: 'ActionOutput_amplitude_getretentionanalysis'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
