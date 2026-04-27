import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-interface-collaborator.js';

describe('airtable delete-interface-collaborator tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-interface-collaborator',
        Model: 'ActionOutput_airtable_deleteinterfacecollaborator'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
