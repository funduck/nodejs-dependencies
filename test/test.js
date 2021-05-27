'use strict';

const fs = require('fs');
const assert = require('assert');

const Dependencies = require('../index');

let errors = 0;
let testCounter = 0;
const test = (title, fn) => {
    console.log(++testCounter, title);
    try {
        fn();
        console.log('\x1b[32m ok \x1b[0m\n');
    } catch (e) {
        console.log('\x1b[31m failed:', e.stack, '\x1b[0m\n');
        errors++;
    }
};

const abc = __dirname + '/abc.json';
const dc = __dirname + '/dc.json';
const abcd = __dirname + '/abcd.json';

const files = {
    a: {
        name: __dirname + '/a.js',
        body: `require('./b');`
    },
    b: {
        name: __dirname + '/b.js',
        body: `require('./c');`
    },
    c: {
        name: __dirname + '/c.js',
        body: ``
    },
    d: {
        name: __dirname + '/d.js',
        body: `require('./c');`
    }
};

console.log('For test we have files:');
for (const i in files) {
    const f = files[i];
    fs.writeFileSync(f.name, f.body);
    console.log(f.name.replace(__dirname, ''), '\n<<<\n', f.body, '\n>>>\n');
}
console.log('Let\'s see how files are included in each other, inclusion will be shown as "->"\n');

let dep;

test('Instantiate new "Dependencies" object and build it for files "d" and "c", it should be: c->d', () => {
    dep = new Dependencies();
    dep.setProjectRoot(__dirname);

    dep.build(files.d.name, __dirname + '/c'); // this shows that you can omit .js or .json suffix
    console.log(dep.toJSON());
    assert.deepEqual(dep.toJSON(), {
        'c.js': ['d.js'],
        'd.js': []
    });
});
test('save dc.json', () => {
    dep.save(dc, {});
});

test('load dc.json in another "Dependencies" and check that it is equal to originally built: c->d', () => {
    const d2 = new Dependencies();
    d2.load(dc);
    console.log(d2.toJSON());
    assert.deepEqual(d2.toJSON(), dep.toJSON());
});

test('Build "Dependencies" for files "a", "b", "c" it should be: c->b->a', () => {
    dep.build(files.a.name, files.b.name, files.c.name);
    console.log(dep.toJSON());
    assert.deepEqual(dep.toJSON(), {
        'c.js': ['a.js', 'b.js'],
        'b.js': ['a.js'],
        'a.js': []
    });
});

test('save abc.json', () => {
    dep.save(abc, {});
});

test('load abc.json in another "Dependencies" and check that it is equal to originally built: c->b->a', () => {
    const d2 = new Dependencies();
    d2.load(abc);
    console.log(dep.toJSON());
    assert.deepEqual(d2.toJSON(), dep.toJSON());
});

test('load two files abc.json and dc.json and inclusions should be: c->b->a, c->d', () => {
    dep = new Dependencies();
    dep.setProjectRoot(__dirname);
    dep.load(abc, dc);
    console.log(dep.toJSON());
    assert.deepEqual(dep.toJSON(), {
        'd.js': [],
        'c.js': ['a.js', 'b.js', 'd.js'],
        'b.js': ['a.js'],
        'a.js': []
    });
});

test('save abcd.json', () => {
    dep.save(abcd, {});
});

test('remove file "a" and after checkRemovedFiles inclusions should be: c->b, c->d', () => {
    fs.unlinkSync(files.a.name);
    dep.checkRemovedFiles();
    console.log(dep.toJSON());
    assert.deepEqual(dep.toJSON(), {
        'd.js': [],
        'c.js': ['b.js', 'd.js'],
        'b.js': []
    });
});

test('save abcd.json and loaded scheme should still contain file "a" because we merged data', () => {
    dep.save(abcd, {});
    dep.load(abcd);
    console.log(dep.toJSON());
    assert.deepEqual(dep.toJSON(), {
        'd.js': [],
        'c.js': ['a.js', 'b.js', 'd.js'],
        'b.js': ['a.js'],
        'a.js': []
    });
});

test('save abcd.json overwriting the file, so loaded scheme should be without "a"', () => {
    dep.checkRemovedFiles();
    dep.save(abcd, {overwrite: true});
    dep.load(abcd);
    console.log(dep.toJSON());
    assert.deepEqual(dep.toJSON(), {
        'd.js': [],
        'c.js': ['b.js', 'd.js'],
        'b.js': []
    });
});

[files.a.name, files.b.name, files.c.name, files.d.name, abc, dc, abcd].forEach(file => {
    fs.existsSync(file) && fs.unlinkSync(file);
});

process.exit(errors == 0 ? 0 : 1);
