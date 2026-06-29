import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-history-item.js';

describe('elevenlabs delete-history-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-history-item',
        Model: 'ActionOutput_elevenlabs_deletehistoryitem'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
