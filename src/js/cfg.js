import * as esprima from 'esprima';

let codeNodes = {};
let currentIndex = 0;
let functionString = '';
let numberOfScopes = 0;

const parseCode = (codeToParse) => {
    return esprima.parseScript(codeToParse, {loc: true});
};
 
export function createCfgGraph(codeToParse, args){

    currentIndex = 1, codeNodes = {}, numberOfScopes = 0;
    functionString = createArgumentsDeclarationString(args);
    codeNodes[currentIndex] = {'content': [], 'children': [], 'isFeasible': true, 'truePath': undefined, 'isCondition': false};
    let parsedCode = parseCode(codeToParse);
    parsedCode.body.forEach(element => {
        createItemAccordingToType(element, args, undefined);
    });
    let graphString = createGraphString();
    return graphString;
}

let typeToHandlerMapping = {
    'FunctionDeclaration': functionDeclarationHandler,
    'BlockStatement': blockStatementHandler,
    'VariableDeclaration': variableDeclarationHandler,
    'ExpressionStatement': expressionStatementHandler,
    'WhileStatement': whileStatementHandler,
    'IfStatement': ifStatementHandler,
    'ReturnStatement':returnStatementHandler,
    'BinaryExpression': binaryExpressionHandler,
    'MemberExpression': memberExpressionHandler,
    'UnaryExpression': unaryExpressionHandler,
    'AssignmentExpression': assignmentExpressionHandler,
    'UpdateExpression': updateExpressionHandler,
    'Identifier':identifierHandler,
    'Literal': literalHandler, 
    'ArrayExpression': ArrayExpressionHandler
};

function createItemAccordingToType(element, args, isTrue){
    return typeToHandlerMapping[element.type](element, args, isTrue);
}

function functionDeclarationHandler(element, args, isTrue){
    createItemAccordingToType(element.body, args, isTrue);
}

function variableDeclarationHandler(element, args, isTrue){
    let declarationIndex = 1, stringToReturn = '';
    element.declarations.forEach(declaration => {
        let value = null;
        if(declaration.init != null)
            value = createItemAccordingToType(declaration.init, args, isTrue);
        let name = declaration.id.name;
        stringToReturn += createVariableDeclarationString(name, value, declarationIndex, element);
        declarationIndex++;
    });
    functionString += 'let ' +  stringToReturn +';';
    codeNodes[currentIndex].content.push(stringToReturn + '\n');
}

function createVariableDeclarationString(name, value, declarationIndex, element){
    let stringToReturn = '';
    if(value == null)
        stringToReturn += name;
    else
        stringToReturn += !Array.isArray(value) ? name + ' = ' + value : name + ' = [' + value + ']';
    stringToReturn += declarationIndex < element.declarations.length ? ', ' : '';
    return stringToReturn;
}

function expressionStatementHandler(element, args, isTrue){
    return createItemAccordingToType(element.expression, args, isTrue);
}

function assignmentExpressionHandler(element, args, isTrue){
    let name = createItemAccordingToType(element.left, args, isTrue);
    let value = createItemAccordingToType(element.right, args, isTrue);
    let stringToReturn = name + ' = ' + value;
    codeNodes[currentIndex].content.push(stringToReturn + '\n');
    functionString += stringToReturn + ';';
}

function memberExpressionHandler(element, args, isTrue){
    let variable = element.object.name;
    let index = createItemAccordingToType(element.property, args, isTrue);
    return variable + '[' + index + ']';
}

function binaryExpressionHandler(element, args, isTrue){
    let operator = element.operator;
    let right = createItemAccordingToType(element.right, args, isTrue);
    let left = createItemAccordingToType(element.left, args, isTrue);
    return left + ' ' + operator + ' ' + right;
}

function whileStatementHandler(element, args, isTrue, scopeString = ''){
    let isFeasible = isTrue === undefined ? true : isTrue; 
    isTrue = checkIfIsTrue(scopeString, isTrue);
    let condition = createItemAccordingToType(element.test, args, isTrue);
    let stringToCheck = functionString;
    for(let i = 1; i < numberOfScopes; i++)
        stringToCheck += '}';
    stringToCheck += scopeString + condition + '}'; 
    if(checkNestedCondition(stringToCheck, isTrue) || checkCondition(numberOfScopes, stringToCheck))
        isTrue = true;
    else
        isTrue = false;
    functionString += 'while(' + condition + ')';
    addWhileToDictionary(element, args, isTrue, scopeString, isFeasible, condition);
}

function checkIfIsTrue(scopeString, isTrue){
    return numberOfScopes == 1 ? false : isTrue;
}

function checkNestedCondition(stringToCheck, isTrue){
    return numberOfScopes > 1 && isTrue && eval(stringToCheck);
}

function checkCondition(numberOfScopes, stringToCheck){
    return numberOfScopes == 1 && eval(stringToCheck);
}

function addWhileToDictionary(element, args, isTrue, scopeString, isFeasible, condition){
    initialWhileNodeInDictionary(isFeasible, condition);
    let whileNode = currentIndex - 1;
    codeNodes[currentIndex] = {'content': [], 'children': [], 'isFeasible': isTrue, 'truePath': true, 'isCondition': false};
    createItemAccordingToType(element.body, args, isTrue, scopeString);
    codeNodes[currentIndex].children.push(whileNode);
    codeNodes[++currentIndex] = {'content': [], 'children': [], 'isFeasible': isFeasible, 'truePath': false, 'isCondition': false, 'fromWhile':true};
    codeNodes[whileNode].children.push(currentIndex);
}

function initialWhileNodeInDictionary(isFeasible, condition){
    if(codeNodes[currentIndex].content.length == 0)
        codeNodes[currentIndex].isCondition = true;
    else {
        codeNodes[currentIndex].children.push(++currentIndex);
        codeNodes[currentIndex] = {'content': [], 'children': [], 'isFeasible': isFeasible, 'truePath': true, 'isCondition': true};
    }
    codeNodes[currentIndex].content.push(condition);
    codeNodes[currentIndex].isFeasible = isFeasible;
    codeNodes[currentIndex].children.push(++currentIndex);
}

function unaryExpressionHandler(element, args, isTrue){
    let operator = element.operator;
    let argument = createItemAccordingToType(element.argument, args, isTrue);
    return operator + argument;
}


function ifStatementHandler(element, args, isTrue, conditionNodes, blocksNodes, type = 'if', scopeString = ''){
    let isFeasible = isTrue === undefined ? true : isTrue; 
    isTrue = checkIfIsTrue(scopeString, isTrue);
    let truePath = type === 'if' ? undefined : false;
    initialIfNodeInDictionary(conditionNodes, isFeasible, truePath);
    if(!conditionNodes)
        conditionNodes = [];
    if(!blocksNodes)
        blocksNodes = [];
    isTrue = addIfToDictionary(element, args, isTrue, conditionNodes, blocksNodes, isFeasible, type, scopeString);
    createItemAccordingToType(element.consequent, args, isTrue, scopeString);
    CheckIfHasAlternateOrEndOfIfStatement(conditionNodes, blocksNodes, element, args, isTrue);
}

function CheckIfHasAlternateOrEndOfIfStatement(conditionNodes, blocksNodes, element, args, isTrue){
    if(element.alternate != undefined) {
        alternareHandler(element, args, !isTrue, conditionNodes, blocksNodes); // If we are in elseif and the if was true, the node is not feasible
    } else{
        if(conditionNodes.length == 1)
            blocksNodes.push(conditionNodes[0]); 
        connectConditionsNodeToNextNode(blocksNodes);
    }
}

function initialIfNodeInDictionary(conditionNodes, isFeasible, truePath){
    if(codeNodes[currentIndex].content.length == 0)
        codeNodes[currentIndex].isCondition = true;
    else {
        if(conditionNodes)
            codeNodes[conditionNodes[conditionNodes.length - 1]].children.push(++currentIndex);
        else
            codeNodes[currentIndex].children.push(++currentIndex);
        codeNodes[currentIndex] = {'content': [], 'children': [], 'isFeasible': isFeasible, 'truePath': truePath, 'isCondition': true};
    }
}

function addIfToDictionary(element, args, isTrue, conditionNodes, blocksNodes, isFeasible, type, scopeString){
    let condition = createItemAccordingToType(element.test, args, isTrue, scopeString);
    isTrue = evalCondition(isTrue, scopeString, condition);
    conditionNodes.push(currentIndex);
    codeNodes[currentIndex].content.push(condition);
    codeNodes[currentIndex].isFeasible = isFeasible;
    codeNodes[currentIndex].children.push(++currentIndex);
    codeNodes[currentIndex] = {'content': [], 'children': [], 'isFeasible': isTrue, 'truePath': true, 'isCondition': false};
    blocksNodes.push(currentIndex);
    if(type === 'if')
        functionString += 'if(' + condition + ')';
    else
        functionString += 'else if(' + condition + ')';
    return isTrue;
}

function evalCondition(isTrue, scopeString, condition){
    let stringToCheck = functionString;
    for(let i = 1; i < numberOfScopes; i++)
        stringToCheck += '}';
    stringToCheck += scopeString + condition + '}'; 
    if(checkNestedCondition(stringToCheck, isTrue) || checkCondition(numberOfScopes, stringToCheck))
        return true;
    else
        return false;
}

function alternareHandler(element, args, isTrue, conditionNodes, blocksNodes){
    if(element.alternate.type === 'IfStatement')
        ifStatementHandler(element.alternate, args, isTrue, conditionNodes, blocksNodes, 'else if');
    else 
        elseHandler(element, args, isTrue, conditionNodes, blocksNodes);
}

function elseHandler(element, args, isTrue, conditionNodes, blocksNodes){
    codeNodes[conditionNodes[conditionNodes.length - 1]].children.push(++currentIndex);
    blocksNodes.push(currentIndex);
    codeNodes[currentIndex] = {'content': [], 'children': [], 'isFeasible': isTrue, 'truePath': false};
    functionString += 'else';
    createItemAccordingToType(element.alternate, args, isTrue);
    conditionNodes.push(currentIndex);
    connectConditionsNodeToNextNode(blocksNodes);
}

function connectConditionsNodeToNextNode(conditionNodes){
    if(codeNodes[currentIndex].content.length > 0)
        codeNodes[++currentIndex] = {'content': [], 'children': [], 'isFeasible': true, 'truePath': false, 'isCondition': false};
    else if(checkIfLastNodeIsWhileEnd())
        codeNodes[currentIndex].fromWhile = false;
    conditionNodes.forEach(node => {
        codeNodes[node].children.push(currentIndex);
    });
}

function returnStatementHandler(element, args, isTrue){
    let value = createItemAccordingToType(element.argument, args, isTrue);
    if(checkIfLastNodeIsWhileEnd())
        codeNodes[currentIndex].content.push('return ' + value);
    else {
        codeNodes[currentIndex].children.push(++currentIndex);
        codeNodes[currentIndex] = {'content': ['return ' + value], 'children': [], 'isFeasible': true, 'truePath': undefined, 'isCondition': false};
    }
}

function checkIfLastNodeIsWhileEnd(){
    return codeNodes[currentIndex].content.length == 0 && codeNodes[currentIndex].fromWhile != undefined && codeNodes[currentIndex].fromWhile == true;
}

function blockStatementHandler(element, args, isTrue){
    functionString += '{';
    numberOfScopes++;
    element.body.forEach(bodyElement => {
        createItemAccordingToType(bodyElement, args, isTrue);
    });
    numberOfScopes--;
    functionString += '}';

}

function updateExpressionHandler(element, args, isTrue){
    let operator = element.operator;
    let argument = createItemAccordingToType(element.argument, args, isTrue);
    codeNodes[currentIndex].content.push(argument + operator + '\n');
    functionString += argument + operator + ';';
    return argument + operator;
}

function identifierHandler(element){
    return  element.name;
}

function literalHandler(element){
    return element.raw;
}

function ArrayExpressionHandler(element, args, isTrue){
    let elements = [];
    element.elements.forEach(item => {
        elements.push(createItemAccordingToType(item, args, isTrue));
    });
    return elements;
}

export function createArgumentsDeclarationString(args){
    let stringToReturn = '';
    for(let arg in args){
        stringToReturn += 'let ' + arg + '=' + args[arg] +'; ';
    }
    return stringToReturn;
}

export function createGraphString() {
    let initialStringAndMapping = createNodesInitialString();
    let graphString = initialStringAndMapping[0];
    let nodesMapping = initialStringAndMapping[1];
    graphString = createGraphFlowString(graphString, nodesMapping);
    return graphString;
}

function getContent(contentList) {
    let contentString = '';
    for(let item in contentList) 
        contentString += contentList[item];
    return contentString;
}

function createNodesInitialString(){
    let graphString = '', conditionIndex = 1, operationIndex = 1, startIndex = 1, nodesMapping = {};
    for(let nodeId in codeNodes){
        if(codeNodes[nodeId].isCondition){
            graphString += 'cond' + conditionIndex + '=>condition: ** ' + nodeId + ' **\n' + getContent(codeNodes[nodeId].content);
            nodesMapping[nodeId] = 'cond' + conditionIndex++;
        } else{
            if(codeNodes[nodeId].content.length > 0) {
                graphString += 'op' + operationIndex + '=>operation: ** ' + nodeId + ' **\n' + getContent(codeNodes[nodeId].content);
                nodesMapping[nodeId] = 'op' + operationIndex++;
            } else {
                graphString += 'st' + startIndex + '=>start: ** ' + nodeId + ' **\n' + getContent(codeNodes[nodeId].content);
                nodesMapping[nodeId] = 'st' + startIndex++;
            }
        }
        graphString += codeNodes[nodeId].isFeasible ? ' | approved\n' : '| else\n';
    }
    return [graphString, nodesMapping];
}

function createGraphFlowString(graphString, nodesMapping){
    let alreadyCheckedNodes = [];
    for (let id in nodesMapping){
        // if(alreadyCheckedNodes.includes(id))
        //     continue;
        let nodesStringResult = createNodesString(graphString, nodesMapping, id, alreadyCheckedNodes);
        alreadyCheckedNodes = nodesStringResult[0];
        graphString = nodesStringResult[1];
    }
    return graphString;
}

function createNodesString(graphString, nodesMapping, id, alreadyCheckedNodes){
    if(codeNodes[id].isCondition){
        let conditionOutput = conditionStringGraph(graphString, nodesMapping, id);
        graphString = conditionOutput[0];
        for(let i = id; i <= conditionOutput[1]; i++)
            alreadyCheckedNodes.push(i);
    }
    else {
        for(let child in codeNodes[id].children){
            graphString += nodesMapping[id] + '->' + nodesMapping[codeNodes[id].children[child]] + '\n';
        }
    }
    return [alreadyCheckedNodes, graphString];
}

function conditionStringGraph(graphString, nodesMapping, id){
    let originalId = id;
    graphString += nodesMapping[id] + '(yes)->' + nodesMapping[++id] + '\n';
    if(codeNodes[id].isCondition){
        let conditionOutput = conditionStringGraph(graphString, nodesMapping, id);
        graphString = conditionOutput[0];
        id = conditionOutput[1];
    }
    else {
        for(let child in codeNodes[id].children){
            graphString += nodesMapping[id] + '->' + nodesMapping[codeNodes[id].children[child]] + '\n';
        }
    }
    if(codeNodes[id].truePath)
        id++;
    graphString += nodesMapping[originalId] + '(no)->' + nodesMapping[id] + '\n';
    return [graphString, id];
}