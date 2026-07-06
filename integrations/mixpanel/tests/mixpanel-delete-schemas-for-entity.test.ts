import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-schemas-for-entity.js';

describe('mixpanel delete-schemas-for-entity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-schemas-for-entity',
        Model: 'ActionOutput_mixpanel_deleteschemasforentity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
