var path = require("path");
var fs = require("fs");

var Q = require("q");

function listFilesByName(dir, extension){
    extension = extension || ".pdf";
    var d = Q.defer();
    return Q().then(function(){
        fs.readdir(dir, function(error, files){
            if(error){
              return d.resolve([]);  
            } 
            var filtered = files.filter(function(file){
                return path.extname(file) === extension;
            });
            var sortedByName = filtered.sort(function (a, b) {
                return a.localeCompare(b);
            });
            var files = sortedByName.map(function(file){
                return path.resolve(dir, file);
            });
            return d.resolve(files);  
        });
        return d.promise;
    });
}

module.exports = {
    listFilesByName: listFilesByName
};

