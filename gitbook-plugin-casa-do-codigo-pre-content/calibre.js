var exec = require('child_process').exec;

var Q = require("q");

function generate(inputFilename, outputFilename, options){
    var d = Q.defer();

    console.log("calibre - Preparing to call calibre...");

    return Q().then(function(){
        var calibreCall = "ebook-convert " + inputFilename + " " + outputFilename + " " + calibreOptions(options); 

        console.log("calibre - Calling calibre...");
        console.log(calibreCall);
        
        exec(calibreCall, function (error, stdout, stderr) {
            if (error) {
                console.log("calibre - Error calling calibre. :/")
                return d.reject(error.message + " "+stdout);
            }
            console.log("calibre - done! :)");
            return d.resolve();
        });
        
        return d.promise;
    });
}

function calibreOptions(options){
    var calibreOptions = "";
    for(option in options){
        var value = options[option];
        if(value){
            if(typeof value == "boolean"){
                calibreOptions += option + ' ';
            } else {
                calibreOptions += option + '="' + options[option] + '" ';
            }
        }
    }
    return calibreOptions;
}

module.exports = {
    generate: generate
};