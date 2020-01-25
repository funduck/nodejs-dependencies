# Dynamic dependencies
*How not to run all the tests in a project every time?*  
*How to run tests only for files changed in a commit?*  
*How to track which tests cover which files?*  
*How to run tests only for particular file?*  

These are the questions this module answers to.  

This module:
* Can build a tree of dependencies between `*.js` files in a project (excluding node\_modules) and return it in JSON 
```
{
    "module file name": ["used in this module", "and in this too", ...]
}
```
* Can save tree to file
* Can load tree from file
* Can merge multiple files

## How it works
The idea is to walk `module.children` starting from given module.  
It works only after project runs, for example after its tests are executed.  
Aim is to resolve dynamic imports which is impossible for static codebase analysis.  

## Main use case
is supposed to be
* run your project's test
* build dependencies
* save to file
* run another test
* build its dependencies
* save to another file or merge with previous file
* after all tests are done merge all files in one, you have full information "which tests cover which sources"

**here comes what it is buit for**  

You have changed some sources and want to run test only for these files, so read dependencies file you have saved before
```
{
    "some/module.js": ["other/module.js", "test/test_some_module.js", "test/test_other_module.js"]
}
```
And just take test files from the list for changed files.

## When it doesn't help
What to do if tests in a project are run with some `test_by_data.js` script that uses `*.json` files that describe actual tests?  
While in for example **mocha** you can select which tests to run based on their title, dependency tree will tell you that for every file its test is `test_by_data.js` and you will have to run them all.

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

