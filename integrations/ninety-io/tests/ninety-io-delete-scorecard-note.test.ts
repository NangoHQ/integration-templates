import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-scorecard-note.js';

describe('ninety-io delete-scorecard-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-scorecard-note',
        Model: 'ActionOutput_ninety_io_deletescorecardnote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
