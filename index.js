'use strict';

/**
Builds a tree of modules dependencies
Saves it to file
Merges multiple files

See toJSON for details
*/

const fs = require('fs');
const path = require('path');
const d = require('./dependencies');

module.exports = class {
    constructor() {
        this.files = new Set();
    }

    setProjectRoot(projectRoot) {
        if (!fs.existsSync(projectRoot)) {
            throw new Error(`projectRoot ${projectRoot} not exists`);
        }
        const s = fs.statSync(projectRoot);
        if (!s.isDirectory()) {
            throw new Error(`projectRoot ${projectRoot} is not directory`);
        }
        this.projectRoot = projectRoot;
        if (this.projectRoot[this.projectRoot.length - 1] != '/') this.projectRoot += '/';
    }

    /* Build tree */
    build(...files) {
        if (Array.isArray(files[0])) files = files[0];
        const filesNames = new Set();
        files.forEach(file => {
            if (!fs.existsSync(file)) {
                if (fs.existsSync(file + '.js')) {
                    file += '.js';
                } else {
                    if (fs.existsSync(file + '.json')) {
                        file += '.json';
                    } else {
                        throw new Error(`file ${file} not exists`);
                    }
                }
            }
            require(file);
            filesNames.add(path.resolve(__dirname, file));
        });
        const modules = [];
        module.children.forEach(m => {
            if (filesNames.has(m.filename)) {
                modules.push(m);
            }
        });
        this.tree = d.mergeTrees(
            modules.map(m => {
                return d.getTree(m, this.projectRoot);
            })
        );
    }

    /* Load trees from files and merge with current */
    load(...files) {
        if (Array.isArray(files[0])) files = files[0];
        const trees = files.map(file => {
            return d.loadTree(file);
        });
        if (this.tree) trees.push(this.tree);
        this.tree = d.mergeTrees(trees);
    }

    /* Remove references to removed files */
    checkRemovedFiles() {
        d.clearTreeFromRemovedFiles(this.tree, this.projectRoot);
    }

    /* Saving tree */
    save(file, overwrite) {
        if (!this.tree) {
            throw new Error('build tree first');
        }
        const saved = !overwrite && fs.existsSync(file) ? d.loadTree(file) : {};
        d.saveTree(d.mergeTrees(this.tree, saved), file);
    }

    /**
    Get json document describing modules dependencies
    {
        "module file name": ["used in this module", "and in this too", ...]
    }
    For example, if project contains tests :) it helps finding tests for a module, not only personal, but for all other modules that use it
    {
        "some/module.js": ["other/module.js", "test/test_some_module.js", "test/test_other_module.js"]
    }
    */
    toJSON() {
        return d.treeToJson(this.tree);
    }
} 