'use strict';

const fs = require('fs');

/**
Builds a tree of modules dependencies
Saves it to file
Merges multiple files

@typedef {object.<string, Set>} Tree
*/

const jsonToTree = (json) => {
    const tree = {};
    for (const name in json) {
        tree[name] = new Set(json[name]);
    }
    return tree;
};

const treeToJson = (tree) => {
    const json = {};
    for (const name in tree) {
        const ar = [];
        for (const v of tree[name].values()) ar.push(v);
        json[name] = ar.sort();
    }
    return json;
};

/**
@param {string} file
@return {Tree}
*/
const loadTree = (file) => {
    if (!fs.existsSync(file)) { 
        throw new Error(`file ${file} not exists`);
    }
    const json = JSON.parse(fs.readFileSync(file, {encoding: 'utf-8'}));
    return jsonToTree(json);
};

/**
Save Tree in a file

@param {Tree} tree
@param {string} file
*/
const saveTree = (tree, file) => {
    fs.writeFileSync(file, JSON.stringify(treeToJson(tree)));
};

/**
Merges multiple trees into one

@param {Array.<Tree>} trees
@return {Tree}
*/
const mergeTrees = (...trees) => {
    if (Array.isArray(trees[0])) trees = trees[0];

    const tree = {};
    trees.forEach(t => {
        for (const name in t) {
            if (!tree[name]) tree[name] = new Set();
            for (const v of t[name].values()) tree[name].add(v);
        }
    });
    return tree;
};

const getFname = (projectRoot) => {
    return (m) => {
        let re;
        if (m.filename.startsWith(projectRoot)) {
            re = m.filename.slice(projectRoot.length).match(/\/?(.+)$/);
            if (re) {
                return re[1];
            }
        }
        re = m.filename.match(new RegExp('(node_modules\/.*)$'));
        if (re) {
            return re[1];
        }
        return m.filename;
    };
};

/**
Build a Tree of modules dependencies

@param {object} rootModule
@param {string} projectRoot
@return {Tree}
*/
const getTree = (rootModule, projectRoot) => {
    if (!rootModule) {
        throw new Error('Invalid rootModule');
    }
    if (!projectRoot || !fs.existsSync(projectRoot)) {
        throw new Error('Invalid projectRoot');
    }
    const fname = getFname(projectRoot);

    const rawTree = {};

    const addChildren = (m, check) => {
        const name = fname(m);

        if (check && name.match(/node_modules/)) return;

        rawTree[name] = rawTree[name] || new Set();

        m.children.forEach((c) => {
            const cname = fname(c);
            rawTree[cname] = rawTree[cname] || new Set();
            rawTree[cname].add(name);
            rawTree[cname].add(rawTree[name]);
            
            addChildren(c, true);
        });
    };

    addChildren(rootModule, !true);

    const reduceSet = (set) => {
        const res = new Set();
        set.forEach(elem => {
            if (elem instanceof Set) {
                reduceSet(elem).forEach(el => {
                    res.add(el);
                });
            } else {
                res.add(elem);
            }
        });
        return res;
    };

    const plainTree = {};

    for (const name in rawTree) {
        plainTree[name] = reduceSet(rawTree[name]);
    }

    return plainTree;
};

/**
Removes from tree references to non existing files
@param {Tree} tree
@param {string} projectRoot

*/
const clearTreeFromRemovedFiles = (tree, projectRoot) => {
    if (typeof tree != 'object') {
        throw new Error('Invalid tree');
    }
    if (!projectRoot || !fs.existsSync(projectRoot)) {
        throw new Error('Invalid projectRoot');
    }

    const removed = new Set();
    const present = new Set();
    const exists = (name) => {
        if (!present.has(name) && 
           (removed.has(name) || !fs.existsSync(projectRoot + name))
        ) {
            return false;
        }
        present.add(name);
        return true;
    };
 
    for (const name in tree) {
        if (exists(name)) {
            const set = tree[name];
            for (const cname of set.values()) {
                if (exists(cname)) {
                    present.add(cname);
                } else {
                    removed.add(cname);
                    set.delete(cname);
                }
            }
        } else {
            removed.add(name);
            delete tree[name];
        }
    }
};

module.exports = { getTree, loadTree, saveTree, mergeTrees, clearTreeFromRemovedFiles, jsonToTree, treeToJson };
