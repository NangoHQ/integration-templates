import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/download-cohort.js';

describe('amplitude download-cohort tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'download-cohort',
        Model: 'ActionOutput_amplitude_downloadcohort'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
