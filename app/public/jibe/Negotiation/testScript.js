console.log("Loaded test script");

function testFunction(textToDisplay) {
    console.log("Received message from unity");
    $('#TestArea').val(textToDisplay);
}