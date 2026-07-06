import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-background-jobs.js';

describe('instantly list-background-jobs tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-background-jobs',
        Model: 'ActionOutput_instantly_listbackgroundjobs'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
