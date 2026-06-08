import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-survey.js';

describe('posthog delete-survey tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-survey',
        Model: 'ActionOutput_posthog_deletesurvey'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
