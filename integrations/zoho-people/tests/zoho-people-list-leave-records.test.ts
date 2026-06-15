import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-leave-records.js';

describe('zoho-people list-leave-records tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-leave-records',
        Model: 'ActionOutput_zoho_people_listleaverecords'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
