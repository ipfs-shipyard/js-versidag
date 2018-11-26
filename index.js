'use strict';

const VersidagNode = require('./lib/versidag-node');

const createVersidag = (initialVersion, config) => {
    const rootNode = new VersidagNode(null, config);

    return rootNode.add(initialVersion);
};

const resumeVersidag = (nodeCid, config) => new VersidagNode(nodeCid, config);

module.exports = { createVersidag, resumeVersidag };
