module.exports = function(grunt) {

  grunt.initConfig({
    copy: {
      build: {
       files: [
        { src:"bower_components/jquery/dist/jquery.min.js", dest:"third-party/jquery.min.js" },
        { src:"bower_components/angular/angular.min.js", dest:"third-party/angular.min.js" },
        { src:"bower_components/angular-localforage/dist/angular-localForage.min.js", dest:"third-party/angular-localForage.min.js" },
        { src:"bower_components/angular-uuid4/angular-uuid4.min.js", dest:"third-party/angular-uuid4.min.js" },
        { src:"bower_components/FileSaver/FileSaver.min.js", dest:"third-party/FileSaver.min.js" },
        { src:"bower_components/skrollr/dist/skrollr.min.js", dest:"third-party/skrollr.min.js" },

        { src:"bower_components/bootstrap-sweetalert/lib/sweet-alert.min.js", dest:"third-party/sweet-alert.min.js" },
        { src:"bower_components/bootstrap-sweetalert/lib/sweet-alert.css", dest:"third-party/sweet-alert.css" },

        { src:"bower_components/jquery-ui/jquery-ui.min.js", dest:"third-party/jquery-ui.min.js" },
        { src:"bower_components/angular-ui-sortable/sortable.min.js", dest:"third-party/sortable.min.js" },
        { src:"bower_components/localforage/dist/localforage.min.js", dest:"third-party/localforage.min.js" },

        { src:"bower_components/bootstrap/dist/css/bootstrap.min.css", dest:"third-party/bs/css/bootstrap.min.css" },
        { src:"bower_components/bootstrap/dist/js/bootstrap.min.js", dest:"third-party/bs/js/bootstrap.min.js" },
        { src:"bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.eot", dest:"third-party/bs/fonts/glyphicons-halflings-regular.eot" },
        { src:"bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.woff", dest:"third-party/bs/fonts/glyphicons-halflings-regular.woff" },
        { src:"bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.svg", dest:"third-party/bs/fonts/glyphicons-halflings-regular.svg" },
        { src:"bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.ttf", dest:"third-party/bs/fonts/glyphicons-halflings-regular.ttf" }
       ]
      }
    }
 });
 
 grunt.loadNpmTasks('grunt-contrib-copy');
 grunt.registerTask('default', ['copy']);
};
