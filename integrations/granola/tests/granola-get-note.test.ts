import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-note.js';

describe('granola get-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-note',
        Model: 'ActionOutput_granola_getnote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
