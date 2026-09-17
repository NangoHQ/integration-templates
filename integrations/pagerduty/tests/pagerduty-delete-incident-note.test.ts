import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-incident-note.js';

describe('pagerduty delete-incident-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-incident-note',
        Model: 'ActionOutput_pagerduty_deleteincidentnote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
