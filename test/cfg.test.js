import assert from 'assert';
import {createArgumentsDeclarationString, createCfgGraph} from '../src/js/cfg';

describe('Function string creation', () => {
    let args1 = {x:1, y:2, z:3};

    it('concat arg variables', () => {
        assert.equal(
            createArgumentsDeclarationString(args1), 'let x=1; let y=2; let z=3; '
        );
    });
});

describe('The symbol substitution', () => {
    it('replace local variables', () => {
        assert.equal(
            createCfgGraph('function func(x){\n' + 'let a=x;\n' + 'return a;\n' +'}', {}),
            'op1=>operation: ** 1 **\na = x\n | approved\nop2=>operation: ** 2 **\nreturn a | approved\nop1->op2\n'
        );
    });

    // it('handle global variables', () => {
    //     assert.equal(
    //         createCfgGraph('let x=2;\n' + 'function func(){\n' + 'let a=x+1;\n' + 'return a;\n' +'}', {}),
    //         '<pre>let x = 2;</pre><pre>function func(){</pre><pre>return (x + 1);</pre><pre> }</pre>'
    //     );
    // });
    // it('replace local variables with the function arguments', () => {
    //     let symbolTable = {};
    //     symbolTable['x'] = [];
    //     symbolTable['y'] = [];
    //     symbolTable['z'] = [];
    //     symbolTable['x'].push({'line': 0, 'conditions:': [], 'value:': 1});
    //     symbolTable['y'].push({'line': 0, 'conditions:': [], 'value:': 2});
    //     symbolTable['z'].push({'line': 0, 'conditions:': [], 'value:': 3});
    //     assert.equal(
    //         createCfgGraph('function func(x, y, z){\n' + 'let a=x+y+z;\n' + 'if(a>5)\n' + 'return a+a;\n' +'}', symbolTable),
    //         '<pre>function func(x,y,z)  {</pre><pre class=red>if((x + y + z) > 5)</pre><pre>return (x + y + z) + (x + y + z);</pre><pre> }</pre>'
    //     );
    // });
    it('handle arrays variables', () => {
        let symbolTable = {};
        assert.equal(
            createCfgGraph('function func(){\n' + 'let arr=[1, 2, 3];\n' + 'let a = 0, b;\n'+ 'arr[2]=4;\n' + 'if(arr[1]>arr[a])\n' + 'return arr[2]+1;\n}', symbolTable),
            'op1=>operation: ** 1 **\narr = [1,2,3]\na = 0, b\narr[2] = 4\n | approved\ncond1=>condition: ** 2 **\narr[1] > arr[a] | approved\nst1=>start: ** 3 **\n | approved\nop2=>operation: ** 4 **\nreturn arr[2] + 1 | approved\nst2=>start: ** 5 **\n | approved\nop1->cond1\ncond1(yes)->st1\nst1->op2\nst1->st2\ncond1(no)->op2\nst1->op2\nst1->st2\n'
        );
    });
    it('handle locals arrays variables', () => {
        let symbolTable = {};
        assert.equal(
            createCfgGraph('function func(){\n' + 'let arr=[1, 2, 3];\n' + 'arr[2]=4;\n' + 'if(arr[1]>arr[2])\n' + 'return arr[2]+1;}\n', symbolTable),
            'op1=>operation: ** 1 **\narr = [1,2,3]\narr[2] = 4\n | approved\ncond1=>condition: ** 2 **\narr[1] > arr[2] | approved\nst1=>start: ** 3 **\n| else\nop2=>operation: ** 4 **\nreturn arr[2] + 1 | approved\nst2=>start: ** 5 **\n | approved\nop1->cond1\ncond1(yes)->st1\nst1->op2\nst1->st2\ncond1(no)->op2\nst1->op2\nst1->st2\n'
        );
    });
    it('handle if else statements', () => {
        assert.equal(
            createCfgGraph('function func(){\n' + 'let x=1;\n' + 'const y=2;\n' + 'var a = x;\n' + 'if(a>y){\n' + 'x = 2;\n'+ 'return a+1;}\n' +
                                        'else if(a<y){\n' + 'x=x+1;}\n' + 'else\n' + 'return x+y;\n' + 'return x;\n}', {}),
            'op1=>operation: ** 1 **\nx = 1\ny = 2\na = x\n | approved\ncond1=>condition: ** 2 **\na > y | approved\nop2=>operation: ** 3 **\nx = 2\n| else\nop3=>operation: ** 4 **\nreturn a + 1 | approved\ncond2=>condition: ** 5 **\na < y | approved\nop4=>operation: ** 6 **\nx = x + 1\n | approved\nst1=>start: ** 7 **\n| else\nop5=>operation: ** 8 **\nreturn x + y | approved\nst2=>start: ** 9 **\n | approved\nop6=>operation: ** 10 **\nreturn x | approved\nop1->cond1\ncond1(yes)->op2\nop2->op3\nop2->st2\ncond1(no)->op3\nop2->op3\nop2->st2\ncond2(yes)->op4\nop4->st2\ncond2(no)->st1\nop4->st2\nst1->op5\nst1->st2\nst2->op6\n'
        );
    });
    it('handle nested if statements', () => {
        assert.equal(
            createCfgGraph('function func(){\n' + 'let y;\n' + 'let x=2;\n' + 'if(x>1){\n'+ 'if(x>2){\n' + 'x=x+1;}}\n'+ 'return x+1;}\n', {}),
            'op1=>operation: ** 1 **\ny\nx = 2\n | approved\ncond1=>condition: ** 2 **\nx > 1 | approved\ncond2=>condition: ** 3 **\nx > 2 | approved\nop2=>operation: ** 4 **\nx = x + 1\n| else\nst1=>start: ** 5 **\n | approved\nop3=>operation: ** 6 **\nreturn x + 1 | approved\nop1->cond1\ncond1(yes)->cond2\ncond2(yes)->op2\nop2->st1\ncond2(no)->st1\ncond1(no)->op3\ncond2(yes)->op2\nop2->st1\ncond2(no)->st1\nop2->st1\nst1->op3\n'
        );
    });
    it('handle while statements', () => {
        assert.equal(
            createCfgGraph('function func(){\n' + 'let x=1, y=2;\n' +  'x++;\n' + 'let a = x;\n' + 'y = a + 1;\n' + 'while(a>y)\n' + 'return a+1;}', {}),
            'op1=>operation: ** 1 **\nx = 1, y = 2\nx++\na = x\ny = a + 1\n | approved\ncond1=>condition: ** 2 **\na > y | approved\nst1=>start: ** 3 **\n| else\nop2=>operation: ** 4 **\nreturn a + 1 | approved\nst2=>start: ** 5 **\n | approved\nop1->cond1\ncond1(yes)->st1\nst1->op2\ncond1(no)->op2\nst1->op2\nop2->cond1\n'
        );
    });
    it('handle nested while statements', () => {
        assert.equal(
            createCfgGraph('function func(){\n' + 'let y;\n' + 'let x=2;\n' + 'while(x>1){\n'+ 'if(x>2){\n' + 'x=x+1;}}\n'+ 'return x+1;}\n', {}),
            'op1=>operation: ** 1 **\ny\nx = 2\n | approved\ncond1=>condition: ** 2 **\nx > 1 | approved\ncond2=>condition: ** 3 **\nx > 2 | approved\nop2=>operation: ** 4 **\nx = x + 1\n| else\nst1=>start: ** 5 **\n | approved\nop3=>operation: ** 6 **\nreturn x + 1 | approved\nop1->cond1\ncond1(yes)->cond2\ncond2(yes)->op2\nop2->st1\ncond2(no)->st1\ncond1(no)->op3\ncond2(yes)->op2\nop2->st1\ncond2(no)->st1\nop2->st1\nst1->cond1\n'
        );
    });
    it('handle condition with unary variable', () => {
        assert.equal(
            createCfgGraph('function func(){\n' + 'let x=true;\n' +  'if(!x)\n' + 'return x;}', {}),
            'op1=>operation: ** 1 **\nx = true\n | approved\ncond1=>condition: ** 2 **\n!x | approved\nst1=>start: ** 3 **\n| else\nop2=>operation: ** 4 **\nreturn x | approved\nst2=>start: ** 5 **\n | approved\nop1->cond1\ncond1(yes)->st1\nst1->op2\nst1->st2\ncond1(no)->op2\nst1->op2\nst1->st2\n'
        );
    });


});

// describe('The colors module', () => {
//     it('color the line in green when true', () => {
//         assert.equal(
//             createLineWithClass(true, 'if(x>1)'),'<pre class=green>if(x>1)</pre>'
//         );
//     });
//     it('color the line in red when false', () => {
//         assert.equal(
//             createLineWithClass(false, 'if(x>1)'),'<pre class=red>if(x>1)</pre>'
//         );
//     });
// });
