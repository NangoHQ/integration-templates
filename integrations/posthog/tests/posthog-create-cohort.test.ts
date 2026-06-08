import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-cohort.js';

describe('posthog create-cohort tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-cohort',
        Model: 'ActionOutput_posthog_createcohort'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
