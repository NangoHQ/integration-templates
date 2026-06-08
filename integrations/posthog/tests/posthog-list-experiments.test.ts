import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-experiments.js';

describe('posthog list-experiments tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-experiments',
        Model: 'ActionOutput_posthog_listexperiments'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
