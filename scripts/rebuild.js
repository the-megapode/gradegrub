//find frame node and replace document's html with frame html
var frameNode = document.getElementById("docViewBodyFrame");
if(frameNode != null)
{
    frameNode.addEventListener("load", launchRebuild, false);
}
function launchRebuild()
{
    var i = 0;
    document.replaceChild(frameNode.contentDocument.firstChild, document.firstChild);
    buildGradeChanger();
}
//holds real assignment data
var originalGrades;
//holds overall grade data for the class
var fullSummary;
//keeps track of whether a grade is currently being edited
var editing = false;
var editingFinal = false;
//keeps track of currently edited grade
var oldAssignment;

//keeps track of currently edited final grade
var oldFinalGrade;

//whether or not the currently edited grade has already been edited
var isEdited = false;

//array holding categories of extra grades added by user
var extraGrades;
//global variables holding assignment/grade table bodies
var assignmentTableBody;
var gradeTableBody;
var assignmentRows;

//whether or not the help box is currently expanded
var expandedHelp = false;

//setup final grade table and assignment table
function buildGradeChanger()
{
    var formElement = document.getElementsByName("docViewForm").item(0);
    var mainTable = formElement.getElementsByTagName("table").item(0);
    var tableDiv = document.createElement("div");
    tableDiv.className = "gradeTable"
    tableDiv.appendChild(mainTable);
    formElement.parentNode.replaceChild(tableDiv, formElement);
    
    var tables = document.getElementsByClassName("edlDocViewContents").item(0).getElementsByTagName("table")
    //array of all class assignments
    originalGrades = new Array();
    extraGrades = new Array();
    
    //help button
    var helpDiv = document.createElement("div");
    var helpLink = document.createElement("a");
    helpLink.innerHTML = "Show GradeGrub help";
    helpLink.addEventListener("click", toggleHelp, false);
    helpLink.href = "void";
    
    helpImg = document.createElement("img");
    helpImg.setAttribute("src", chrome.extension.getURL("images/edlogo.png"));
    helpDiv.appendChild(helpLink);
    helpDiv.appendChild(helpImg);
    
    for(var i = 0;i<tables.length;i++)
    {
        //read in all table rows
        var tRows = tables[i].getElementsByTagName("tr");
        //assume three tables
        switch(i)
        {
            case 2:
                //insert help link
                tables[i].parentNode.insertBefore(helpDiv, tables[i]);
                break;
            //table with overall category grades
            case 3:
                tables[i].setAttribute("class","edits");
                //remove width from table elements
                var allElements = tables[i].getElementsByTagName("td");
                for(var c = 0;c<allElements.length;c++)
                    allElements[c].removeAttribute("width");
                //make final grade editable
                fullSummary = getGradeSummary(tRows);
                var finalElement = tRows[tRows.length - 1].getElementsByTagName("td")[1];
                var finalGradeSpan = createEditableNumberAnchor(finalElement.innerHTML, finalGradeClick);
                finalElement.innerHTML = "";
                finalElement.appendChild(finalGradeSpan);
                
                
                var addRow = document.createElement("tr");
                var addCatElement = document.createElement("td");
                var addCatButton = document.createElement("input");
                addCatButton.setAttribute("type", "button");
                addCatButton.value = "New category";
                addCatButton.addEventListener("click", onNewCategory);
                addCatElement.appendChild(addCatButton);
                
                var spaceElem = document.createElement("td");
                spaceElem.setAttribute("colspan", 4);
                addRow.appendChild(addCatElement);
                addRow.appendChild(spaceElem);
                
                gradeTableBody = tables[i].getElementsByTagName("tbody")[0];
                //gradeTableBody.insertBefore(addRow, tRows[tRows.length - 2]);
                break;
            //table with individual assignment grades
            case 5:
                assignmentTableBody = tables[i].getElementsByTagName("tbody")[0];
                assignmentTableBody.setAttribute("class","edits");
                assignmentRows = assignmentTableBody.getElementsByTagName("tr");
                var reading = false;
                for(var n = 0;n<tRows.length;n++)
                {
                    var tableElements = tRows[n].getElementsByTagName("td");
                    for(var ind = 0;ind<tableElements.length;ind++)
                    {
                        tableElements[ind].removeAttribute("width");
                    }
                    if(tableElements[5] != null)
                    {
                        if(reading)
                        {
                            var gradeSpan = createEditableNumberAnchor(tableElements[5].innerHTML, gradeClick);
                            tableElements[5].innerHTML = "";
                            tableElements[5].appendChild(gradeSpan);
                            var maxSpan = createEditableNumberAnchor(tableElements[6].innerHTML, maxClick);
                            tableElements[6].innerHTML = "";
                            tableElements[6].appendChild(maxSpan);
                            
                            var assign = new Assignment(tRows[n]);
                            
                            //TODO: check for null getAssignment and create new
                                
                            originalGrades.push(assign);
                        }
                        else if(tableElements[5].innerHTML == "<b>Grade</b>")
                        {
                            reading = true;
                        }
                    }
                }
                //new assignment row
                var newRow = document.createElement("tr");
                var removeCell = document.createElement("td");
                removeCell.setAttribute("colspan", 7);
                
                //new assignment button
                var btnItem = document.createElement("td");
                var newButton = document.createElement("input");
                newButton.value = "New assignment";
                newButton.setAttribute("type","button");
                newButton.addEventListener('click', addNew, false);
                //remove new assignments button
                var removeNew = document.createElement("input");
                removeNew.value = "Remove all new assignments";
                removeNew.setAttribute("type","button");
                removeNew.setAttribute("disabled","true");
                removeNew.addEventListener('click',onRemoveAll, false);
                
                
                btnItem.appendChild(newButton);
                removeCell.appendChild(removeNew);
                newRow.appendChild(removeCell);
                newRow.appendChild(btnItem);
                
                assignmentTableBody.appendChild(newRow);
                break;
        }
    }
    updateGrade(fullSummary);
}
//expands/collapses the GradeGrub help box
function toggleHelp(e)
{
    e.preventDefault();
    expandedHelp = !expandedHelp;
    if(expandedHelp)
    {
        e.target.innerHTML = "Hide GradeGrub help";
        var request = new XMLHttpRequest();
        request.open("GET",chrome.extension.getURL("help.html"),false);
        request.send();
        
        helpDiv = document.createElement("div");
        helpDiv.innerHTML = request.responseText;
        
        e.target.parentNode.parentNode.insertBefore(helpDiv, e.target.parentNode.nextSibling);
    }
    else
    {
        e.target.innerHTML = "Show GradeGrub help";
        e.target.parentNode.parentNode.removeChild(e.target.parentNode.nextSibling);
    }
}
//adds a new assignment to the table when the 'new assignment' button is clicked
function addNew(e)
{
    var newRow = document.createElement("tr");
    newRow.className = "useradded";
    
    var id_t = document.createElement("td");
    var name_t = document.createElement("td");
    var date_t = document.createElement("td");
    var category_t = document.createElement("td");
    var weight_t = document.createElement("td");
    var grade_t = document.createElement("td");
    var max_t = document.createElement("td");
    var letter_t = document.createElement("td");

    id_t.innerHTML = originalGrades.length + extraGrades.length + 1;
        
    var anchor = document.createElement("a");
    anchor.addEventListener('click', onClickNewName, false);
    anchor.setAttribute("href","void");
    anchor.innerHTML = "New assignment";
    
    name_t.appendChild(anchor);
    name_t.className = "editText";
    
    var theDate = new Date();
    date_t.innerHTML = (theDate.getMonth()+1) + "/" + theDate.getDate() + "/" + theDate.getFullYear();
    
    //create a dropdown box for category
    var selectElem = document.createElement("select");
    for(var i = 0;i<fullSummary.categories.length;i++)
    {
        var opItem = document.createElement("option");
        opItem.setAttribute("value",fullSummary.categories[i].name);
        opItem.innerHTML = fullSummary.categories[i].name;
        selectElem.appendChild(opItem);
    }
    category_t.appendChild(selectElem);
    selectElem.addEventListener('change',changeCategory, false);
    
    weight_t.innerHTML = 1;
    grade_t.appendChild(createEditableNumberAnchor("", gradeClick));
    max_t.appendChild(createEditableNumberAnchor("10", maxClick));
    max_t.className = "maxScore";
    
    var deleteAnchor = createDeleteAnchor();
    letter_t.appendChild(deleteAnchor);
    
    newRow.appendChild(id_t);
    newRow.appendChild(name_t);
    newRow.appendChild(date_t);
    newRow.appendChild(category_t);
    newRow.appendChild(weight_t);
    newRow.appendChild(grade_t);
    newRow.appendChild(max_t);
    newRow.appendChild(letter_t);
    
    extraGrades.push(new Assignment(newRow));
    
    //enable 'remove all' button
    e.target.parentNode.parentNode.firstChild.firstChild.removeAttribute("disabled");
    assignmentTableBody.insertBefore(newRow, assignmentTableBody.lastChild);
}
function onRemoveAll(e)
{
    for(var i = 0;i<extraGrades.length;i++)
    {
        removeExtraGrade(i);
        //always remove the penultimate child in the node list
        assignmentTableBody.removeChild(assignmentTableBody.lastChild.previousSibling);
    }
    //remove all grades from extraGrades
    extraGrades = new Array();
    updateGrade(fullSummary);
    e.target.setAttribute("disabled","true");
}
//updates the grade when the assignment category is changed on a user-created assignment
function changeCategory(e)
{
    //no original value for extra assignments
    var currentRow = e.target.parentNode.parentNode;
    var index = parseInt(currentRow.firstChild.innerHTML) - originalGrades.length - 1;
    
    var oldAssign = extraGrades[index];
    
    var newAssign = oldAssign.copy();
    newAssign.category = e.target.value;
    
    extraGrades[index] = newAssign;
    
    fullSummary = updateSummary(fullSummary, newAssign, oldAssign);
    updateGrade(fullSummary);
}
//turns an assignment grade element into an editable form
function gradeClick(e)
{
    e.preventDefault();
    if(e.target.nodeName == "A")
    {
        if(!editing)
        {
            var tableElement = e.target.parentNode;
            tableElement.removeAttribute("class");
            //store old assignment
            oldAssignment = new Assignment(tableElement.parentNode);
            var initialText;
            if(isUnknownGrade(e.target.innerHTML))
                initialText = "";
            else
                initialText = e.target.innerHTML;
            var editForm = createEditForm(initialText, editGrade, onCancelGrade);
            
            tableElement.innerHTML = "";
            tableElement.appendChild(editForm);
            editing = true;
        }
    }
}

//turns an assigment max score element into an editable form
function maxClick(e)
{
    e.preventDefault();
    if(e.target.nodeName == "A")
    {
        if(!editing)
        {
            var tableElement = e.target.parentNode;
            tableElement.removeAttribute("class");
            //store old assignment
            oldAssignment = new Assignment(tableElement.parentNode);
            var initialText;
            if(isUnknownGrade(e.target.innerHTML))
                initialText = "";
            else
                initialText = e.target.innerHTML;
            var editForm = createEditForm(initialText, editMax, onCancelGrade);
            
            tableElement.innerHTML = "";
            tableElement.appendChild(editForm);
            editing = true;
        }
    }
}
//turns the final class grade into a form for automatically adjusting all assignments 
function finalGradeClick(e)
{
    e.preventDefault();    
   if(e.target.nodeName == "A")
    {
        if(!editing)
        {
            //disable the new assignment and remove assignment buttons
            assignmentTableBody.lastChild.firstChild.firstChild.setAttribute("disabled","true");
            assignmentTableBody.lastChild.lastChild.firstChild.setAttribute("disabled","true");
            assignmentTableBody.lastChild.lastChild.firstChild.setAttribute("title","Assignment editing is disabled while automatically adjusting a grade.");
            assignmentTableBody.setAttribute("class","uneditable");
            editing = true;
            editingFinal = true;
            var tableElement = e.target.parentNode;
            tableElement.removeAttribute("class");
            tableElement.removeAttribute("align");
            var initialText = e.target.innerHTML;
            oldFinalGrade = initialText;
            var editForm = createEditForm(initialText, editFinal, onCancelFinal);       
            
            //get form content from page_ui and add to default edit form
            var request = new XMLHttpRequest();
            request.open("GET",chrome.extension.getURL("page_ui.html"),false);
            request.send();
            
            var optionsSpan = document.createElement("span");  
            optionsSpan.innerHTML = request.responseText;
            var targetSelect = optionsSpan.firstChild.getElementsByTagName("select")[0];
            targetSelect.addEventListener('change',onGradeSelectChange, false);
            optionsSpan.firstChild.getElementsByTagName("input")[0].addEventListener('change',onUngradedToggle,false);
            
            var labelSpan = document.createElement("span");
            labelSpan.innerHTML = "Target grade:";
            
            editForm.insertBefore(optionsSpan, editForm.firstChild.nextSibling);
            editForm.insertBefore(labelSpan, editForm.firstChild);
            
            //add a checkbox to every assignment
            var colTitle = document.createElement("td");
            colTitle.setAttribute("id", "notgray");
            colTitle.innerHTML = "Adjust grade";
            assignmentRows[1].appendChild(colTitle);
            for(var i = 2;i<assignmentRows.length - 1;i++)
            {
                var newTableElement = document.createElement("td");
                var rowCheck = document.createElement("input");
                rowCheck.setAttribute("type","checkbox")
                if((new Assignment(assignmentRows[i])).unknown)
                    rowCheck.setAttribute("checked","true");
                newTableElement.appendChild(rowCheck);
                assignmentRows[i].appendChild(newTableElement);
            }
            
            tableElement.innerHTML = "";
            tableElement.appendChild(editForm);
            
        }
    }
}
//sets the desired grade textbox according to the letter grade the user selects
function onGradeSelectChange(e)
{
    var textbox = e.target.parentNode.parentNode.parentNode.getElementsByTagName("input")[0];
    switch(e.target.value)
    {
        case "A":
            textbox.value = 89.5;
            break;
        case "B":
            textbox.value = 79.5;
            break;
        case "C":
            textbox.value = 69.5;
            break;
        case "D":
            textbox.value = 59.5;
            break;
        default:
            //do nothing, leave textbox as is
            break;
    }
}
//checks or unchecks all ungraded assignments when the user changes this checkbox in the auto-adjust form
function onUngradedToggle(e)
{
    for(var i = 2;i<assignmentRows.length - 1;i++)
    {
        if((new Assignment(assignmentRows[i])).unknown)
            assignmentRows[i].lastChild.firstChild.checked = e.target.checked;
    }
}
//recalculates adjustable grades to the same (approximate) value so that the current grade becomes the desired grade
function editFinal(e)
{
    e.preventDefault();
	var totalWeight = 0.0;
	for(var i = 0;i<fullSummary.categories.length;i++)
		totalWeight += fullSummary.categories[i].weight;
    var desiredGrade = parseFloat(e.target.childNodes[1].value)/100;
	
    //linear algebra time!
    var LHS = new Array();
    LHS.push(new Array());
    
    var RHS = new Array();
    
    var adjustables= getAllAdjustableAssignments();
    for(var i = 0;i<adjustables.length;i++)
    {
        if(adjustables[i].unknown)
        {
            var tAdj = adjustables[i].copy();
            tAdj.unknown = false;
            tAdj.points = "0";
            tAdj.categoryObject = adjustables[i].categoryObject;
            tAdj.tableRow = adjustables[i].tableRow;
            fullSummary = updateSummary(fullSummary, tAdj, adjustables[i]);
            adjustables[i] = tAdj;
        }
    }
    updateGrade(fullSummary);
    var currentGrade = fullSummary.numericalGrade;
    //assign grades, putting matrix into upper triangular form (can be done easily since most rows are mostly zeros)
    for(var i = 0;i<adjustables.length;i++)
    {
        if(i == 0)
        {
            for(var c = 0;c<adjustables.length;c++)
            {
                LHS[0].push(((adjustables[c].categoryObject.weight)/totalWeight)/adjustables[c].categoryObject.maxScore);
            }
            RHS.push(desiredGrade - currentGrade);
        }else
        {
            var pivot = LHS[i - 1][0];//because we don't include zeros, index of pivot is always 0
            LHS.push(new Array());
            var factor = (1/adjustables[i - 1].outOf)/pivot;//divide first assignment by pivot to find row multiplier
            for(var c = i;c<adjustables.length;c++)
            {
                if(c == i)//only the first element in this row should already have something in it
                {
                    LHS[i].push(-1/(adjustables[c].outOf) - LHS[i-1][(c-i)+1]*factor);
                }
                else//otherwise just subtract the multiplier times the above row
                {
                    LHS[i].push(-1 * LHS[i-1][(c-i)+1]*factor);//subtract factor * element directly above this one
                }
            }
            var assignGrade1 = (parseGrade(adjustables[i - 1].points)/adjustables[i-1].outOf);
            var assignGrade2 = (parseGrade(adjustables[i].points)/adjustables[i].outOf);
            RHS.push((assignGrade2 - assignGrade1) - RHS[i - 1]*factor);
        }
    }
    //solve system
    var gradeDeltas = new Array();
    for(var i = RHS.length - 1;i>=0;i--)
    {
        var rightside = RHS[i];
        var gIndex = 0;
        for(var c = LHS[i].length - 1;c>0;c--)
        {
            rightside -= gradeDeltas[gIndex]*LHS[i][c];
            gIndex++;
        }
        gradeDeltas.push(rightside/LHS[i][0]);
    }
    //find rounding option
    var roundType = e.target.getElementsByTagName("span")[1].getElementsByTagName("select")[1].value;
    //adjust grades
    for(var i = 0;i<adjustables.length;i++)
    {
        var newAssignment = adjustables[i].copy();
        newAssignment.unknown = false;
        var newPoints = (parseGrade(adjustables[i].points) + gradeDeltas[adjustables.length - 1 - i]);
        if(roundType == "integer")
            newPoints = Math.ceil(newPoints);
        else if(roundType == "halfpt")
        {
            var fPart = newPoints - Math.floor(newPoints);
            if(fPart > 0.5)
                fPart = 1;
            else if(fPart != 0)
                fPart = 0.5;
            newPoints = Math.floor(newPoints) + fPart;
        }
        else if(roundType == "decimal")
        {
            //round to two decimal places anyway
            newPoints = Math.round(newPoints * 100)/100;
        }
        newAssignment.points = newPoints + "";
        if(adjustables[i].tableRow.className == "useradded")
            extraGrades[adjustables[i].index - originalGrades.length] = newAssignment;
        fullSummary = updateSummary(fullSummary, newAssignment, adjustables[i]);
        newAssignment.setRow(adjustables[i].tableRow);
    }
    updateGrade(fullSummary);
    removeCheckboxes();
    editing = false;
    editingFinal = false;
    assignmentTableBody.lastChild.lastChild.firstChild.removeAttribute("disabled");
    assignmentTableBody.lastChild.lastChild.firstChild.removeAttribute("title");
    assignmentTableBody.setAttribute("class","edits");
    if(extraGrades.length != 0)
        assignmentTableBody.lastChild.firstChild.firstChild.removeAttribute("disabled");
}
//returns final grade to its old state (removes auto-adjust form)
function onCancelFinal(e)
{
    var tableElement = e.target.parentNode.parentNode;
    tableElement.innerHTML = "";
    tableElement.setAttribute("align","center");
    tableElement.appendChild(createEditableNumberAnchor(oldFinalGrade, finalGradeClick));
    removeCheckboxes();
    editing = false;
    editingFinal = false;
    assignmentTableBody.lastChild.lastChild.firstChild.removeAttribute("disabled");
    assignmentTableBody.lastChild.lastChild.firstChild.removeAttribute("title");
    assignmentTableBody.setAttribute("class","edits");
    if(extraGrades.length != 0)
        assignmentTableBody.lastChild.firstChild.firstChild.removeAttribute("disabled");
}
//helper method to get rid of the adjust checkboxes
function removeCheckboxes()
{
    //remove checkboxes
    for(var i = 1;i<assignmentRows.length - 1;i++)
        assignmentRows[i].removeChild(assignmentRows[i].lastChild);
}
//event listener for when the revert button is clicked
function revertClick(e)
{
    e.preventDefault();
    if(!editingFinal)
    {
        revert(e.target.parentNode.parentNode);
    }
}
//update overall grade when user changes an assignment
function editGrade(e)
{
    e.preventDefault();
    var currentTableElement = e.target.parentNode;
    var currentRow = currentTableElement.parentNode;
    
    var newValue = e.target.firstChild.value;
    var newAssignment = oldAssignment.copy();
    var validChange = false;
    
    if(newAssignment.points != newValue && parseGrade(newValue) >=0)
    {
        newAssignment.points = newValue;
        validChange = true;
    }
    newAssignment.unknown = isUnknownGrade(newValue);
    
    if(validChange && parseGrade(newAssignment.points) <= newAssignment.outOf)
    {
        newAssignment.setRow(currentRow, false);
        
        if(currentRow.className == "useradded")
        {
            //update array of extra grades
            extraGrades[newAssignment.index - originalGrades.length] = newAssignment;
        }
        
        fullSummary = updateSummary(fullSummary, newAssignment, oldAssignment);
        updateGrade(fullSummary);
    }
    else
    {
        cancelEdit(currentRow);
    }
    editing = false;
}
//update overall grade when user changes the maximum score on an assignment
function editMax(e)
{
    e.preventDefault();
    var currentTableElement = e.target.parentNode;
    var currentRow = currentTableElement.parentNode;
    
    var newValue = e.target.firstChild.value;
    var newAssignment = oldAssignment.copy();
    
    newAssignment.outOf = parseFloat(newValue);
    if(parseGrade(newAssignment.points) <= newAssignment.outOf)
    {
        newAssignment.setRow(currentRow, false);
        if (newAssignment.index >= originalGrades.length)
            extraGrades[newAssignment.index - originalGrades.length] = newAssignment;
        
        fullSummary = updateSummary(fullSummary, newAssignment, oldAssignment);
        updateGrade(fullSummary);
    }
    else
    {
        cancelEdit(currentRow);
    }
    editing = false;
}
//when an individual new assignment is deleted
function onRemoveNew(e)
{
    e.preventDefault();
    if(!editingFinal)
    {
        var currentRow = e.target.parentNode.parentNode;
        var index = parseInt(currentRow.firstChild.innerHTML) - originalGrades.length - 1;
        removeExtraGrade(index);
        extraGrades.splice(index, 1);
        assignmentTableBody.removeChild(currentRow);
        updateGrade(fullSummary);
        renumberExtras();
        if(extraGrades.length == 0)
            assignmentTableBody.lastChild.firstChild.firstChild.setAttribute("disabled","true");
    }
}
//cancel editing a grade (remove edit form)
function onCancelGrade(e)
{
    var currentRow = e.target.parentNode.parentNode.parentNode;
    cancelEdit(currentRow);
    editing = false;
}
//helper method for cancelling 
function cancelEdit(currentRow)
{
    var cancelRev = true;
    if(currentRow.className == "modified")
        cancelRev = false;
    oldAssignment.setRow(currentRow, cancelRev);
}
//creates a form with an input textbox and an 'OK' and 'Cancel' button. onSubmit and onCancel are event listeners for when
//the user clicks the ok button and the cancel button.
function createEditForm(initialText, onSubmit, onCancel)
{
    var editForm = document.createElement("form");
    editForm.setAttribute("class","replacement");
    //create input elements
    var textbox = document.createElement("input");
    textbox.setAttribute("type","text");
    textbox.setAttribute("value",initialText);
    //set to minimum textbox size
    textbox.setAttribute("size", 1);
    
    var ok_button = document.createElement("input");
    ok_button.setAttribute("type", "submit");
    ok_button.setAttribute("value","OK");
    
    var cancel_button = document.createElement("input");
    cancel_button.setAttribute("type", "button");
    cancel_button.setAttribute("value","Cancel");
    cancel_button.addEventListener('click', onCancel);
    
    editForm.appendChild(textbox);
    editForm.appendChild(ok_button);
    editForm.appendChild(cancel_button);
    editForm.addEventListener('submit', onSubmit);
    return editForm;
}
//return the grade scheme as an object from an array of table rows
function getGradeSummary(tableRows)
{
    var summary = new Object();
    var reading = false;
    for(var i = 0;i<tableRows.length;i++)
    {
        if(reading)
        {
            //reading current category grades
            var tItems = tableRows[i].getElementsByTagName("td");
            if(tItems.length >= 5)
            {
                //found new category
                var category = new Object();
                category.name = tItems[0].innerHTML;
                category.weight = parseFloat(tItems[1].innerHTML);
                if(tItems[2].innerHTML.match(/[\s(&nbsp;)]*/) == tItems[2].innerHTML)
                {
                    category.currentScore = 0;
                    category.maxScore = 0;
                }
                else
                {
                    var arr = tItems[2].innerHTML.split(/\/[ \t]*/);
                    category.currentScore = parseFloat(arr[0]);
                    category.maxScore = parseFloat(arr[1]);
                }
                category.tableRow = tableRows[i];
                summary.categories.push(category);
            }else
            {            
                reading = false;
            }
        }
        else if(tableRows.item(i).firstChild.firstChild.innerHTML == "Category")
        {
            //start reading, initialize array
            reading = true;
            summary.categories = new Array();
        }
        if(tableRows[i].firstChild.innerHTML.match(/.*Current Grade.*/))
        {
            summary.finalGradeRow = tableRows[i];
        }
    }
    summary.initialCategoryNum = summary.categories.length;
    return summary;
}
//assignment method
function getPercentage()
{
    return (parseGrade(this.points)/this.outOf);
}
//constructor for Assignment object. Assignments accept the row of an edline table as input and
//can write to an inputted row.
function Assignment(tableRow)
{
    var tableElements = tableRow.getElementsByTagName("td");
    if(tableRow.className == "useradded")
       this.category = tableElements[3].firstChild.value;
    else
       this.category = tableElements[3].innerHTML;
    this.outOf = parseFloat(tableElements[6].firstChild.innerHTML);
    this.points = tableElements[5].firstChild.innerHTML;
    this.unknown = isUnknownGrade(tableElements[5].firstChild.innerHTML);
    
    this.index = parseInt(tableElements[0].innerHTML) - 1;
    
    
    this.getPercentage = getPercentage;
    this.setRow = setRow;
    this.copy = copy;
    this.getCategory = getCategory;
}
function isAdjustableAssignmentRow(tableRow)
{
    var tableElements = tableRow.getElementsByTagName("td");    
    if(tableElements.length < 9)
        return false;
    if(tableElements[0].innerHTML == "<b>No.</b>")
        return false;
    if(!tableElements[8].firstChild.checked)
        return false;
    return true;
}
//get a letter grade for a numerical score (assuming 0<score<1)
function letterGrade(score)
{
    percent = score * 100;
    if(percent >= 89.5)
        return 'A';
    else if(percent >= 79.5)
        return 'B';
    else if(percent >= 69.5)
        return 'C';
    else if(percent >= 59.5)
        return 'D';
    else
        return 'E';
}
//update the grade summary after a single assignment is changed
function updateSummary(oldSummary, newAssignment, oldAssignment)
{
    for(var i = 0;i<oldSummary.categories.length;i++)
    {
        if(oldSummary.categories[i].name == newAssignment.category)
        {
            oldSummary.categories[i].currentScore += parseGrade(newAssignment.points);
            
            if(!newAssignment.unknown)
                oldSummary.categories[i].maxScore += newAssignment.outOf;         
        }
        if(oldSummary.categories[i].name == oldAssignment.category)
        {
            oldSummary.categories[i].currentScore -= parseGrade(oldAssignment.points);
            if(!oldAssignment.unknown)
                oldSummary.categories[i].maxScore -= oldAssignment.outOf;
        }
        oldSummary.categories[i].tableRow.getElementsByTagName("td")[2].innerHTML =
            oldSummary.categories[i].currentScore + '/' + oldSummary.categories[i].maxScore;
        var newGrade = (oldSummary.categories[i].currentScore/oldSummary.categories[i].maxScore)
        if(oldSummary.categories[i].maxScore != 0)
        {
            oldSummary.categories[i].tableRow.getElementsByTagName("td")[3].innerHTML =
                Math.round(newGrade*10000)/100;
        }
        else
        {
            oldSummary.categories[i].tableRow.getElementsByTagName("td")[3].innerHTML = "";   
        }
    }
    return oldSummary;
}
//update the overall grade table based on the summary
function updateGrade(summary)
{
    var total = 0;
    var totalWeight = 0;
    for(var i = 0;i<summary.categories.length;i++)
    {
        var category = summary.categories[i];
        if(category.maxScore != 0)
        {
            total += category.weight * (category.currentScore)/(category.maxScore)
            totalWeight += category.weight;
        }
    }
    var numericalGrade = total/totalWeight;
    summary.finalGradeRow.getElementsByTagName("td")[1].innerHTML = "";
    summary.finalGradeRow.getElementsByTagName("td")[1].appendChild(createEditableNumberAnchor(Math.round(numericalGrade * 10000)/100, finalGradeClick));
    summary.finalGradeRow.getElementsByTagName("td")[2].innerHTML = letterGrade(numericalGrade);
    summary.finalGradeRow.getElementsByTagName("td")[1].setAttribute("align","center");
    summary.numericalGrade = numericalGrade;
}
//create an anchor that will call onEdit when clicked (presumably will replace the anchor with a form)
function createEditableNumberAnchor(gradeText, onEdit)
{
    if(isUnknownGrade(String(gradeText)))
    {
        gradeText = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
    }
    var gradeSpan = document.createElement("a");
    gradeSpan.setAttribute("href", "void");
    gradeSpan.className = "editable";
    gradeSpan.innerHTML = gradeText;
    gradeSpan.addEventListener('click',onEdit,false);
    return gradeSpan;
}
//restore an assignment back to its true value
function revert(assignmentRow)
{
    var assignment = new Assignment(assignmentRow);
    var oldAssignment = originalGrades[assignment.index];
    
    fullSummary = updateSummary(fullSummary, oldAssignment, assignment);
    updateGrade(fullSummary);
    
    oldAssignment.setRow(assignmentRow, true);
}
//write an assignment to a table row
function setRow(tableRow, revert)
{
    var tableElement = tableRow.getElementsByTagName("td")[5];
    
    tableElement.innerHTML = "";
    if(this.unknown)
        tableElement.appendChild(createEditableNumberAnchor("", gradeClick));
    else
    {
        tableElement.appendChild(createEditableNumberAnchor(this.points, gradeClick));
    }
    if(this.unknown)
        tableRow.getElementsByTagName("td")[7].innerHTML = "";
    else
        tableRow.getElementsByTagName("td")[7].innerHTML = letterGrade(this.getPercentage());
    if(tableRow.className != "useradded")
    {
        if(revert)
        {
            tableRow.className = "original";
        }else
        {
            tableRow.className = "modified";
            var newSpan = createRevertAnchor();
            tableRow.getElementsByTagName("td")[7].appendChild(newSpan);
        }
    }else
    {
        tableRow.getElementsByTagName("td")[7].appendChild(createDeleteAnchor());
    }
    var maxElement = tableRow.getElementsByTagName("td")[6];
    maxElement.innerHTML = "";
    maxElement.appendChild(createEditableNumberAnchor(this.outOf, maxClick));
}
//copy method for an assignment object (leaves out some unorthodox properties)
function copy()
{
    var newAssign = new Object();
    newAssign.points = this.points;
    newAssign.outOf = this.outOf;
    newAssign.category = this.category;
    newAssign.unknown = this.unknown;
    newAssign.name = this.name;
    newAssign.index = this.index;
    
    newAssign.getPercentage = this.getPercentage;
    newAssign.setRow = this.setRow;
    //no recursing
    newAssign.copy = this.copy;
    
    
    return newAssign;
}
//creates a clickable image with the revert() event listener
function createRevertAnchor()
{
    var newAnchor = document.createElement("a");
    var newImg = document.createElement("img");
    newImg.setAttribute("src", chrome.extension.getURL("images/revert.png"));
    newAnchor.className = "revert";
    newAnchor.setAttribute("href", "void");
    newAnchor.addEventListener('click',revertClick, false);
    return newAnchor;
}
function createDeleteAnchor()
{
    var deleteAnchor = document.createElement("a");
    deleteAnchor.setAttribute("href","void");
    deleteAnchor.setAttribute("class", "delete");
    deleteAnchor.addEventListener('click', onRemoveNew, false);
    return deleteAnchor;
}
//returns false if the assignment is already graded, true otherwise
function isUnknownGrade(gradeString)
{
    if(gradeString == "" || gradeString.match(/[ \t(&nbsp;)]+/))
        return true;
    else
        return false;
}
//return a numerical value for a given grade string
function parseGrade(gradeString)
{
    if(gradeString.match(/[Z \t(&nbsp;)]+/) || gradeString == "")
    {
        return 0;
    }
    else
    {
        return parseFloat(gradeString);
    }
}
//return a category object from fullSummary based on the category string of this assignment. If there are no matches, return null.
function getCategory()
{
    for(var i = 0;i<fullSummary.categories.length;i++)
    {
        if(this.category == fullSummary.categories[i].name)
        {
            return fullSummary.categories[i];
        }
    }
    return null;
}
//get an array of all assignments with the "adjust" checkbox marked
function getAllAdjustableAssignments()
{
    var theAssignments = new Array();
    var allAssignmentRows = assignmentTableBody.getElementsByTagName("tr");
    for(var i = 0;i<allAssignmentRows.length;i++)
    {
        if(isAdjustableAssignmentRow(allAssignmentRows[i]))
        {
            var assign = new Assignment(allAssignmentRows[i])
            //unorthodox category property to make grading easier, with unorthodox temporary maximum to
            //account for unknown grades
            assign.categoryObject = assign.getCategory();
            assign.categoryObject.tempMax = assign.categoryObject.maxScore;
            //unorthodox row property to make adjusting rows easier
            assign.tableRow = allAssignmentRows[i];
            theAssignments.push(assign);
        }
    }
    return theAssignments;
}
//change a user-added assignment name into a textbox with that name as its value
function onClickNewName(e)
{
    e.preventDefault();
    var pNode = e.target.parentNode;
    var textbox = document.createElement("input");
    textbox.setAttribute("type","text");
    if(!e.target.innerHTML.match(/(&nbsp;)+/))
        textbox.setAttribute("value", e.target.innerHTML);
    else
        textbox.setAttribute("value","");
    textbox.addEventListener("blur",onDoneEdit,false);
    pNode.innerHTML = "";
    pNode.appendChild(textbox);
}
//change a user-added assignment name to the value entered in the textbox that loses focus
function onDoneEdit(e)
{
    var anchor = document.createElement("a");
    anchor.setAttribute("class","editText");
    anchor.addEventListener('click', onClickNewName, false);
    anchor.setAttribute("href","void");
    //many, many spaces
    if(e.target.value == "" || e.target.value.match(/^[ \t(&nbsp;)]+/))
        anchor.innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"; 
    else
        anchor.innerHTML = e.target.value;  
    var tCell = e.target.parentNode;
    tCell.innerHTML = "";
    tCell.appendChild(anchor);
}
function onNewCategory(e)
{
    createNewCategory();
}
//add a new assignment category to the summary and to the grade table
function createNewCategory(nextRow)
{
    var newTableRow = document.createElement("tr");
    
    var category = new Object();
    category.name = "New category "+(fullSummary.categories.length - fullSummary.initialCategoryNum + 1);
    category.weight = 0;
    category.currentScore = 0;
    category.maxScore = 0;
    
    var name_t = document.createElement("td");
    var weight_t = document.createElement("td");
    var score_t = document.createElement("td");
    
    var nameAnchor = document.createElement("a");
    nameAnchor.setAttribute("class", "editable");
    nameAnchor.addEventListener("click",onClickNewName);
    nameAnchor.innerHTML = category.name;
    nameAnchor.setAttribute("href", "void");
    
    name_t.appendChild(nameAnchor);
    weight_t.innerHTML = category.weight;
    score_t.innerHTML = category.currentScore + "/" + category.maxScore;
    
    newTableRow.appendChild(name_t);
    newTableRow.appendChild(weight_t);
    newTableRow.appendChild(score_t);
    newTableRow.appendChild(document.createElement("td"));
    newTableRow.appendChild(document.createElement("td"));
    
    gradeTableBody.insertBefore(newTableRow, gradeTableBody.lastChild.previousSibling.previousSibling);
    fullSummary.categories.push(category);
}
//prepare extra grade for removal by setting its grade to unknown
function removeExtraGrade(index)
{
    var blanked = extraGrades[index].copy();
    blanked.points = "0";
    blanked.unknown = true;
    fullSummary = updateSummary(fullSummary, blanked, extraGrades[index]);
}
//renumber the ids on new assignments
function renumberExtras()
{
    for(var i = originalGrades.length;i<originalGrades.length + extraGrades.length;i++)
    {
        assignmentRows[i + 2].firstChild.innerHTML = i+1;
    }
}