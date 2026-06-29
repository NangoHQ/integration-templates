import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-history-item.js';

describe('elevenlabs get-history-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-history-item',
        Model: 'ActionOutput_elevenlabs_gethistoryitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
