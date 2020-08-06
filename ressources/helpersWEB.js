
/** Extract variable from address bar
http://www.example.com/index.php?id=1&image=awesome.jpg
Calling getQueryVariable("id") - would return "1".
Calling getQueryVariable("image") - would return "awesome.jpg".
 */
function getQueryVariable(variable)
{
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1].trim();}
       }
       return(false);
}

// --------------------------------------------------------------------------------}
// --- FILE DROP 
// --------------------------------------------------------------------------------{
// Great success!
function handleDropReader(evt, callback) {
    evt.stopPropagation();
    evt.preventDefault();
    var files = evt.dataTransfer.files;
    // Loop through the FileList and read
    for (var i = 0, f; f = files[i]; i++) {
        // Only process json files.
        //if (!f.type.match('application/json')) {
        //    continue;
        //}
        var reader = new FileReader();
        // Closure to capture the file information.
        reader.onload = (function(theFile) {
            return function(e) {
                callback(e.target.result);
            };
        })(f);

        reader.readAsText(f);
    }
}

function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

// --------------------------------------------------------------------------------}
// --- File Load 
// --------------------------------------------------------------------------------{

/* Launch a User File Selector, with pattern defined by `accept` (e.g. ".json") 
 * Call a callback on the selected/uploaded file */
function loadFileWithCallBack(accept, callback){
    var input = document.createElement('input');
    input.type = 'file';
    input.accept=accept;
    input.addEventListener('change', 
            function readSingleFile(e) {
              var f = e.target.files[0];
              if (!f) {
                return;
              }
              var reader = new FileReader();
              reader.onload = function(e) {
                  callback(e.target.result); // <<< CallBack on stream
              };
              reader.readAsText(f);
            }
        , false);
    input.click();
}
/* Load a a file using Http request and launch a callback */
function loadJSONcallback(filename, callback) {   
    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
    var filename_new=filename+'?t='+Date.now();
    xobj.open('GET', filename_new, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4) {
            if (xobj.status === 404) {
                // do something
                alert('The json file was not found: '+filename);
            }
            if (xobj.status == "200") {
                return callback(xobj.responseText);
            }
        }
    };
    xobj.send(null);  
}


export {getQueryVariable, handleDragOver, handleDropReader, loadJSONcallback , loadFileWithCallBack };
