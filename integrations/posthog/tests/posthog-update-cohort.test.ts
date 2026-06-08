import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-cohort.js';

describe('posthog update-cohort tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-cohort',
        Model: 'ActionOutput_posthog_updatecohort'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
