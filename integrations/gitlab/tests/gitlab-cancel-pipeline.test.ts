import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-pipeline.js';

describe('gitlab cancel-pipeline tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-pipeline',
        Model: 'ActionOutput_gitlab_cancelpipeline'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
