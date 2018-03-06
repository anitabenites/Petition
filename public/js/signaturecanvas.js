$(document).ready(()=>{

    var canvas = document.getElementById("signature"),
        context = canvas.getContext("2d"),
        // rect = canvas.getBoundingClientRect(),
        sig = document.getElementsByName('signature')[0],
        mouseX,
        mouseY;

        //it is a recursive function because everytime the mouse is up the data is saved.
        canvas.addEventListener("mousedown", onMouseDown);

    function onMouseDown(event){
        mouseX = event.offsetX;
        mouseY = event.offsetY;
        canvas.addEventListener("mousemove", onMouseMove);
        document.body.addEventListener("mouseup", onMouseUp);
    }

    function onMouseMove(event){
        context.beginPath();
        context.moveTo(mouseX, mouseY);
        mouseX = event.offsetX;
        mouseY = event.offsetY;
        context.lineTo(mouseX, mouseY);
        context.stroke();
    }

    function onMouseUp(event){
        //here we are getting the image as a string:
        sig.value = canvas.toDataURL();
        canvas.removeEventListener("mousemove", onMouseMove);
        document.body.removeEventListener("mouseup", onMouseUp);
    }

});
