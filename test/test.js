'use strict';

const fs = require('fs');
const assert = require('assert');

const Dependencies = require('../index');

let errors = 0;
const test = (title, fn) => {
    console.log(title);
    try {
        fn();
        console.log('ok\n');
    } catch (e) {
        console.log('failed:', e.stack, '\n');
        errors++;
    }
}

const a = __dirname + '/a.js';
const b = __dirname + '/b.js';
const c = __dirname + '/c.js';
const d = __dirname + '/d.js';

const abc = __dirname + '/abc.json';
const dc = __dirname + '/dc.json';
const abcd = __dirname + '/abcd.json';

fs.writeFileSync(a, `
//console.log('loaded a');
require('./b');
`);
fs.writeFileSync(b, `
//console.log('loaded b');
require('./c');
`);
fs.writeFileSync(c, `
//console.log('loaded c');
`);
fs.writeFileSync(d, `
//console.log('loaded d');
require('./c');
`);

let dep;

test('build d->c tree', () => {
    dep = new Dependencies();
    dep.setProjectRoot(__dirname);

    dep.build(d, __dirname + '/c'); // this shows that you can omit .js or .json suffix
    assert.deepEqual(dep.toJSON(), {
        'c.js': ['d.js'],
        'd.js': []
    });
    dep.save(dc);
});

test('load d->c tree', () => {
    const d2 = new Dependencies();
    d2.load(dc);
    assert.deepEqual(d2.toJSON(), dep.toJSON());
});

test('build a->b->c tree', () => {
    dep.build(a, b);
    assert.deepEqual(dep.toJSON(), {
        'c.js': ['a.js', 'b.js'],
        'b.js': ['a.js'],
        'a.js': []
    });
    dep.save(abc);
});

test('load a->b->c tree', () => {
    const d2 = new Dependencies();
    d2.load(abc);
    assert.deepEqual(d2.toJSON(), dep.toJSON());
});

test('load joined a->b->c and d->c trees', () => {
    dep = new Dependencies();
    dep.setProjectRoot(__dirname);
    dep.load(abc, dc);
    assert.deepEqual(dep.toJSON(), {
        'd.js': [],
        'c.js': ['a.js', 'b.js', 'd.js'],
        'b.js': ['a.js'],
        'a.js': []
    });
    dep.save(abcd);
});

test('remove a.js & checkRemovedFiles', () => {
    fs.unlinkSync(a);
    dep.checkRemovedFiles();
    assert.deepEqual(dep.toJSON(), {
        'd.js': [],
        'c.js': ['b.js', 'd.js'],
        'b.js': []
    }); 
});

test('save and merge', () => {
    dep.save(abcd);
    dep.load(abcd);
    assert.deepEqual(dep.toJSON(), {
        'd.js': [],
        'c.js': ['a.js', 'b.js', 'd.js'],
        'b.js': ['a.js'],
        'a.js': []
    }); 
});

test('save and overwrite', () => {
    dep.checkRemovedFiles();
    dep.save(abcd, true);
    dep.load(abcd);
    assert.deepEqual(dep.toJSON(), {
        'd.js': [],
        'c.js': ['b.js', 'd.js'],
        'b.js': []
    }); 
});

[a, b, c, d, abc, dc, abcd].forEach(file => {
    fs.existsSync(file) && fs.unlinkSync(file);
}); 

process.exit(errors == 0 ? 0 : 1);
