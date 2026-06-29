import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-history.js';

describe('elevenlabs list-history tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-history',
        Model: 'ActionOutput_elevenlabs_listhistory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
