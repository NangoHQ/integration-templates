import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-surveys.js';

describe('posthog list-surveys tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-surveys',
        Model: 'ActionOutput_posthog_listsurveys'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
