import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-annotation.js';

describe('posthog delete-annotation tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-annotation',
        Model: 'ActionOutput_posthog_deleteannotation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
