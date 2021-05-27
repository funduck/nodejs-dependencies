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

        return this;
    }

    /* Build tree */
    /**
    @param {string | Array.<string> | Set.<string>} files
    */
    build(...files) {
        if (Array.isArray(files[0]) || files[0] instanceof Set) files = files[0];
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

        return this;
    }

    /* Load trees from files and merge with current */
    load(...files) {
        if (Array.isArray(files[0])) files = files[0];
        const trees = files.map(file => {
            return d.loadTree(file);
        });
        if (this.tree) trees.push(this.tree);
        this.tree = d.mergeTrees(trees);

        return this;
    }

    /* Remove references to removed files */
    checkRemovedFiles() {
        d.clearTreeFromRemovedFiles(this.tree, this.projectRoot);

        return this;
    }

    /* Saving tree */
    save(file, {overwrite, checkRemovedFiles}) {
        if (!this.tree) {
            throw new Error('build tree first');
        }
        const saved = !overwrite && fs.existsSync(file) ? d.loadTree(file) : {};
        this.tree = d.mergeTrees(this.tree, saved)
        if (checkRemovedFiles) {
            this.checkRemovedFiles()
        }
        d.saveTree(this.tree, file);
    }

    /* Get json document describing modules dependencies */
    toJSON() {
        return d.treeToJson(this.tree);
    }
} 
