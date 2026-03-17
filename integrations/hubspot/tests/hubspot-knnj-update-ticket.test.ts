import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-ticket.js';

describe('hubspot-knnj update-ticket tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-ticket',
        Model: 'ActionOutput_hubspot_knnj_updateticket'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
