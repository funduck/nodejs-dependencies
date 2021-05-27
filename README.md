# Dynamic dependencies
I want to run tests that cover only a part of project that has been changed  
So I have to track dependencies in sources, even if they are dynamic, for example:
```
// static dependency
const db = require('../db')

function save(records, datatype) {
    // dynamic dependency
    const saver = require(`../savers/${datatype}`)
    ...
}
```

## How this module works
The idea is to recursively walk `module.children` starting from given module.  
It works only after application runs for example after execution of tests.  

* It builds a tree of dependencies between `*.js` files in a project (excluding node\_modules) and returns it in JSON 
```
{
    "module file name": ["used in this module", "and in this too", ...]
}
```
* Can save tree to file
* Can load tree from file
* Can merge multiple files

## How to use
### Collect dependencies
* run your project's tests and collect test files
```
const testFiles = new Set()
...
testFiles.add(testFileName)
...
```
* when tests are done build dependencies
```
const Deps = require('nodejs-dynamic-dependencies')
d.setProjectRoot(projectRoot)
d.build(testFiles)
```
* save to file merging with existing
```
d.save(dependenciesFile, {
    overwrite: false, // merge with existing if one is found
    checkRemovedFiles: true
})
```

### Use dependencies to find tests covering part of sources
You have changed some sources and want to run test only for these files, so read dependencies file you have saved before
```
{
    "some/module.js": ["other/module.js", "test/test_some_module.js", "test/test_other_module.js"]
}
```
And just take test files from the list for changed files.
```
function addTestFile(p) {
    if (p.match(/node_modules/)) {
        return
    }
    if (!p.match(testFileRegexp)) {
        if (p.match(/\/test[^\.\/]+\.js/)) skippedTestCandidates.add(p)
        return
    }
    if (!fs.existsSync(p)) {
        return
    }
    testFiles.add(p)
}

const d = new Deps().load(dependenciesFile).toJSON()

// files you want to cover with test, i.e. changed files
filesToCover
.forEach((file) => { 
    const name = file.replace(projectRoot, '') // relative name as in tree
    addTestFile(file);                         // adding file if is test file
    (d[name] || []).forEach((t) => {
        addTestFile(projectRoot + t)           // adding files, where 'file' is used
    })
})
```

## When it doesn't help
Sometimes tests are data driven, for example `test_by_data.js` uses a lot of `*.json` files  
Dependency tree not be able to tell which data-files `test_by_data.js` uses for which sources to test them.

## Example
run `npm test`
```
For test we have files:
/a.js 
<<<
 require('./b'); 
>>>

/b.js 
<<<
 require('./c'); 
>>>

/c.js 
<<<
  
>>>

/d.js 
<<<
 require('./c'); 
>>>

Let's see how files are included in each other, inclusion will be shown as "->"

1 'Instantiate new "Dependencies" object and build it for files "d" and "c", it should be: c->d'
{ 'd.js': [], 'c.js': [ 'd.js' ] }
 ok 

2 'save dc.json'
 ok 

3 'load dc.json in another "Dependencies" and check that it is equal to originally built: c->d'
{ 'd.js': [], 'c.js': [ 'd.js' ] }
 ok 

4 'Build "Dependencies" for files "a", "b", "c" it should be: c->b->a'
{ 'c.js': [ 'a.js', 'b.js' ], 'a.js': [], 'b.js': [ 'a.js' ] }
 ok 

5 'save abc.json'
 ok 

6 'load abc.json in another "Dependencies" and check that it is equal to originally built: c->b->a'
{ 'c.js': [ 'a.js', 'b.js' ], 'a.js': [], 'b.js': [ 'a.js' ] }
 ok 

7 'load two files abc.json and dc.json and inclusions should be: c->b->a, c->d'
{ 'c.js': [ 'a.js', 'b.js', 'd.js' ],
  'a.js': [],
  'b.js': [ 'a.js' ],
  'd.js': [] }
 ok 

8 'save abcd.json'
 ok 

9 'remove file "a" and after checkRemovedFiles inclusions should be: c->b, c->d'
{ 'c.js': [ 'b.js', 'd.js' ], 'b.js': [], 'd.js': [] }
 ok 

10 'save abcd.json and loaded scheme should still contain file "a" because we merged data'
{ 'c.js': [ 'a.js', 'b.js', 'd.js' ],
  'b.js': [ 'a.js' ],
  'd.js': [],
  'a.js': [] }
 ok 

11 'save abcd.json overwriting the file, so loaded scheme should be without "a"'
{ 'c.js': [ 'b.js', 'd.js' ], 'b.js': [], 'd.js': [] }
 ok 
```

