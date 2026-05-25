import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-fine-tuning-job.js';

describe('openai cancel-fine-tuning-job tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-fine-tuning-job',
        Model: 'ActionOutput_openai_cancelfinetuningjob'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
