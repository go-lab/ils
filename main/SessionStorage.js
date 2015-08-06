(function () {
    var i = sessionStorage.length;
    while(i--) {
        var key = sessionStorage.key(i);
        if(/^_goLabCache/.test(key)) {
            sessionStorage.removeItem(key);
        }
    }
})();
