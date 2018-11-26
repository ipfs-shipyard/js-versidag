'use strict';

const { uniq } = require('lodash');

class VersidagNode {
    constructor(nodeCid, config) {
        this._config = config;
        this._cid = nodeCid;
    }

    async add(version) {
        const dagNode = {
            type: 'version',
            parent: this.getCid(),
            version,
        };

        const cid = await this._config.writeNode(dagNode);

        return new VersidagNode(cid, this._config);
    }

    async merge(...cids) {
        const dagNode = {
            type: 'merge',
            parents: uniq([this.getCid(), ...cids]),
        };

        const cid = await this._config.writeNode(dagNode);

        return new VersidagNode(cid, this._config);
    }

    async resolve(options) {
        options = {
            limit: Infinity,
            fromCids: [this.getCid()],
            ...options,
        };

        const queue = [...options.fromCids];
        const resolvedNodes = [];

        while (queue.length > 0) {
            const cid = queue.shift();

            const node = await this._config.readNode(cid);

            console.log('processing', cid, node);
            switch (node.type) {
            case 'version':
                resolvedNodes.unshift(node);

                if (node.parent && !queue.includes(node.parent)) {
                    queue.push(node.parent);
                }

                if (resolvedNodes.length >= options.limit && queue.length === 1) {
                    break;
                }

                break;
            case 'merge':
                queue.unshift(...node.parents);
                break;
            default:
                throw new Error(`Unknown node type: ${node.type}`);
            }
        }

        const versions = resolvedNodes.map((node) => node.version);

        versions.sort(this._config.comparator);

        return {
            versions,
        };
    }

    getCid() {
        return this._cid;
    }
}

module.exports = VersidagNode;
