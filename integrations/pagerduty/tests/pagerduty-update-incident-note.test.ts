import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-incident-note.js';

describe('pagerduty update-incident-note tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-incident-note',
        Model: 'ActionOutput_pagerduty_updateincidentnote'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
