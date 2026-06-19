import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-cohort.js';

describe('amplitude get-cohort tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-cohort',
        Model: 'ActionOutput_amplitude_getcohort'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
