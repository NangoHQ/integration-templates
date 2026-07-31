import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-workflow-participants.js';

describe('ironclad list-workflow-participants tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-workflow-participants',
        Model: 'ActionOutput_ironclad_listworkflowparticipants'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
