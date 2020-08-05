
function Array2D(n,m){
    var x = new Array(n);
    for (var i = 0; i < n; i++) {
      x[i] = new Array(m);
    }
    return x
}

export {Array2D};
