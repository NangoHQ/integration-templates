import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-fine-tuning-jobs.js';

describe('openai list-fine-tuning-jobs tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-fine-tuning-jobs',
        Model: 'ActionOutput_openai_listfinetuningjobs'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
