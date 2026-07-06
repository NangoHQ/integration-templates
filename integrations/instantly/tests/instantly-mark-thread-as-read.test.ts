import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mark-thread-as-read.js';

describe('instantly mark-thread-as-read tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mark-thread-as-read',
        Model: 'ActionOutput_instantly_markthreadasread'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
