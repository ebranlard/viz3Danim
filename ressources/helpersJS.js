/* Set of Javascript helper functions
  */

function linspace(startValue, stopValue, cardinality) {
  var arr = [];
  var step = (stopValue - startValue) / (cardinality - 1);
  for (var i = 0; i < cardinality; i++) {
    arr.push(startValue + (step * i));
  }
  return arr;
}


function closestIndex(array, value){
    // Find closest index in a sorted array
    var len = array.length;
    var i = 0;
    var found = false;
    for( i=0; i<len && !found; i++){
        if(value <= array[i]){found = true; break; }
    }
    return i;
}

export {linspace, closestIndex};
