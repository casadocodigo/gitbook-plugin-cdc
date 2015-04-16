var fs = require("fs");

var Q = require("q");

function listFilesByName(dir){
    var d = Q.defer();
    return Q().then(function(){
        fs.readdir(dir, function(error, files){
            if(error){
              return d.resolve([]);  
            } 
            var sortedByName = files.sort(function (a, b) {
                return a.localeCompare(b);
            });
            var files = sortedByName.map(function(file){
                return dir + "/" + file;
            });
            return d.resolve(files);  
        });
        return d.promise;
    });
}

module.exports = {
    listFilesByName: listFilesByName
};

