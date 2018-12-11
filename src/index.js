import { sortedUniq, isEqual } from 'lodash';
import resolveHeads from './resolve-heads';
import resolveVersions from './resolve-versions';
import getConfig from './config';

const canonicalizeCids = (headCids) => sortedUniq(headCids.sort());

class Versidag {
    constructor(headCids, config) {
        this._config = config;
        this._headCids = canonicalizeCids(headCids);
    }

    get headCids() {
        return this._headCids;
    }

    get config() {
        return this._config;
    }

    async add(version, meta) {
        const dagNode = {
            parents: this.headCids,
            version,
            meta,
        };

        const cid = await this.config.writeNode(dagNode);

        return new Versidag([cid], this.config);
    }

    async merge(otherHeadCids, version) {
        // Remove any non-concurrent heads
        const { headCids } = await resolveHeads(
            canonicalizeCids([...this.headCids, ...otherHeadCids]),
            this.config,
            1
        );

        // Check if the heads are the same.. if they are, we don't need to merge
        // This is important to keep the merge deterministic
        if (isEqual(this.headCids, headCids)) {
            return this;
        }

        const dagNode = {
            parents: headCids,
        };

        if (version != null) {
            dagNode.version = version;
        }

        const cid = await this.config.writeNode(dagNode);

        return new Versidag([cid], this.config);
    }

    union(otherHeadCids) {
        const headCids = canonicalizeCids([...this.headCids, ...otherHeadCids]);

        return new Versidag(headCids, this.config);
    }

    resolve(options) {
        options = {
            fromCids: this.headCids,
            limit: Infinity,
            ...options,
        };

        return resolveVersions(options.fromCids, this.config, options.limit);
    }
}

const createVersidag = (headCids, config) => {
    // Allow heads to be optional
    if (!Array.isArray(headCids)) {
        config = headCids;
        headCids = [];
    }

    return new Versidag(headCids, getConfig(config));
};

export default createVersidag;
