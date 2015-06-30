var Q = require("q");
var swig = require("swig");

function render(content, templateLocation){
    
    console.log("htmlRenderer - Preparing to render html...");
    
    var d = Q.defer();
    return Q()
        .then(function(){
        
        console.log("htmlRenderer - Rendering html...");
        swig.setDefaults({ locals: { version: function () { return new Date(); }}});
        swig.compileFile(templateLocation, {autoescape: false}, function(error, template){
            if(error){
                console.log("htmlRenderer - Error rendering html. :/")
                return d.reject(error);
            }
            var output = template(content);
            console.log("htmlRenderer - html rendered! :)");
            return d.resolve(output);

        });
        return d.promise;
    });
}
                    
module.exports = {
    render: render
};