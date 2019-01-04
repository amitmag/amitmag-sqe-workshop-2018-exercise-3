import $ from 'jquery';
import {createCfgGraph} from './cfg';
import * as flowchart from 'flowchart.js';


$(document).ready(function () {
    $('#moreArgs').click(() => {
        $('#argsTable').append('<tr class="arg"><td><label>name: <input id="name" type="text"></label></td><td><label>value: <input id="value" type="text"></label></td></tr>');
    });

    $('#codeSubmissionButton').click(() => {
        codeSubmissionClicked();
    });
});

function codeSubmissionClicked(){
    let args = {};
    $('tr.arg').each(function() {
        let argName = $(this).find('#name').val();
        let argValue = $(this).find('#value').val();
        if(argValue.charAt(0) == '['){
            let array = argValue.substring(1, argValue.length - 1).replace(/ /g,'').split(',');
            argValue = array;
        }
        args[argName] = argValue;
    });
    let codeToParse = $('#codePlaceholder').val();
    let functionString = createCfgGraph(codeToParse, args);
    var diagram = flowchart.parse(functionString);
    diagram.drawSVG('diagram', {'flowstate' : {
        'approved' : { 'fill' : '#58C4A3', 'font-size' : 12, 'yes-text' : 'T', 'no-text' : 'F' },
        'else': {'yes-text' : 'T', 'no-text' : 'F'}
    }});
}















