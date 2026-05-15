import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-note.js';

describe('pipedrive update-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-note',
        Model: 'ActionOutput_pipedrive_updatenote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
