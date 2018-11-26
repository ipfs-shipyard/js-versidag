'use strict';

const { createVersidag } = require('../..');

const createInMemoryVersidag = (initialVersion, config) => {
    const storage = new Map();

    config = {
        comparator: (version1, version2) => version1.timestamp - version2.timestamp,
        readNode: (cid) => storage.get(cid),
        writeNode: (node) => {
            const cid = Math.round(Math.random() * (10 ** 10)).toString(36);

            storage.set(cid, node);
            console.log('wrote', cid, node);

            return cid;
        },
        ...config,
    };

    return createVersidag(initialVersion, config);
};

module.exports = { createInMemoryVersidag };
