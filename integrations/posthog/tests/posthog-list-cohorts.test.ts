import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-cohorts.js';

describe('posthog list-cohorts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-cohorts',
        Model: 'ActionOutput_posthog_listcohorts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
