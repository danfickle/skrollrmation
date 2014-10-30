/*
TODO:
6. Testing.
14. Add meta generator or link to saved file.
15. Find all TODO's in code, sample.json, etc.
17. Do about/help tab.
18. Add images and get copyright clearance.
19. Do gh-pages.
*/

  var app = angular.module('openScrollAnimator', ['LocalForageModule', 'ui.sortable', 'uuid4']);

  app.controller('osaController', ['$scope', '$q', '$localForage', 'uuid4', '$filter', '$http', function($scope, $q, $localForage, uuid4, $filter, $http) {

    $scope.osaProjects = [];
    $scope.osaScenes = {};              /* Keyed by project.id */
    $scope.osaKeyframes = {};           /* Keyed by scene.id */
    $scope.osaElements = {};            /* Keyed by scene.id */
    $scope.osaElementKeyframeData = {}; /* Keyed by element.id */
    $scope.osaErrors = [];

    $scope.tags = [
      { "name" : 'top', "placeholder" : 'Top (px)', "unit" : 'px' },
      { "name" : 'left', "placeholder" : 'Left (px)', "unit" : 'px' },
      { "name" : 'width', "placeholder" : 'Width (px)', "unit" : 'px' },
      { "name" : 'height', "placeholder" : 'Height (px)', "unit" : 'px' },
      { "name" : 'opacity', "placeholder" : 'Opacity (0.0 to 1.0)', "unit" : '', "min" : 0, "max" : 1, "step" : 0.1 },
      { "name" : 'rotate', "placeholder" : 'Rotate (deg)', "unit" : 'deg', "isTransform" : true },
      { "name" : 'skewX', "placeholder" : 'Skew X (deg)', "unit" : 'deg', "isTransform" : true },
      { "name" : 'skewY', "placeholder" : 'Skew Y (deg)', "unit" : 'deg', "isTransform" : true },
      { "name" : 'z-index', "placeholder" : 'z-index', "unit" : '' }
    ];

    $scope.constants = [
      { "name" : 'src', "placeholder" : 'Image Src (url)', "unit" : '', "isAttr" : true },
      { "name" : 'alt', "placeholder" : 'Image Alt Text', "unit" : '', "isAttr" : true }
    ];

    $scope.allTags = $scope.tags.concat($scope.constants);

    $scope.renderMode = false;
    $scope.loadingData = false;
    $scope.saveNote = '';

    $scope.currentProject = null;
    $scope.currentScene = null;
    $scope.currentElement = null;
    $scope.currentKeyframeId = null;

    $localForage.bind($scope, 'osaProjects');

    $scope.realDeleteElement = function(sceneId, elemId) {

        /* Remove any associated keyframe data. */
        if ($scope.osaElementKeyframeData[elemId])
          delete $scope.osaElementKeyframeData[elemId];

        /* Remove from the in-memory list of elements. */
        if ($scope.osaElements[sceneId]) {
         $.each($scope.osaElements[sceneId], function(idx, elem) {
            if (elem.id == elemId) {
              $scope.osaElements[sceneId].splice(idx, 1);
              return false;
            }
         });
        }

        /* Remove any associated keyframe data from local storage. */
        $localForage.removeItem('osaData-' + elemId);

        if ($scope.currentElement && $scope.currentElement.id == elemId)
          $scope.currentElement = null;
    };

    $scope.realDeleteKeyframe = function(sceneId, keyframeId) {
        /* Remove from the in-memory list of keyframes. */
        if ($scope.osaKeyframes[sceneId]) {
         $.each($scope.osaKeyframes[sceneId], function(idx, kf) {
            if (kf.id == keyframeId) {
              $scope.osaKeyframes[sceneId].splice(idx, 1);
              return false;
            }
         });
        }

        if ($scope.currentKeyframeId == keyframeId)
          $scope.currentKeyframeId = null;
    };

    $scope.realDeleteScene = function(projectId, sceneId) {
         /* Remove associated elements. */
         $localForage.getItem('osaElements-' + sceneId).then(function(elems) {
           $.each(elems, function(idx, elem) {
             $scope.realDeleteElement(sceneId, elem.id);
           });
         });

         /* Remove associated keyframes. */
         $localForage.getItem('osaKeyframes-' + sceneId).then(function(kfs) {
           $.each(kfs, function(idx, kf) {
             $scope.realDeleteKeyframe(sceneId, kf.id);
           });
         });

         /* Remove lists from memory. */
         delete $scope.osaElements[sceneId];
         delete $scope.osaKeyframes[sceneId];

         /* Remove lists from storage. */
         $localForage.removeItem('osaKeyframes-' + sceneId);
         $localForage.removeItem('osaElements-' + sceneId);

         /* Finally if, the parent project is loaded, this will remove it from the scenes list on screen. */
         if ($scope.osaScenes[projectId])
         {
           $.each($scope.osaScenes[projectId], function(idx, scene) {
             if (scene.id == sceneId) {
               $scope.osaScenes[projectId].splice(idx, 1);
               return false;
             }
           });
         }

         if ($scope.currentScene && $scope.currentScene.id == sceneId)
           $scope.currentScene = null;
    };

    $scope.realDeleteProject = function(projectId) {
      $localForage.getItem('osaScenes-' + projectId).then(function(scenes) {

        /* Remove associated scenes. */
        $.each(scenes, function(idx, scene) {
          $scope.realDeleteScene(projectId, scene.id);
        });

        $localForage.removeItem('osaScenes-' + projectId);
      });

      if ($scope.osaProjects)
      {
        /* Remove from memory list. */
        $.each($scope.osaProjects, function(idx, project) {
          if (project.id == projectId) {
            $scope.osaProjects.splice(idx, 1);
            return false;
          }
        });
      }

      if ($scope.currentProject && $scope.currentProject.id == projectId)
        $scope.currentProject = null;
    };

    $scope.deleteProject = function(idx, id) {
      swal( { "title" : 'Delete Project Confirmation',
              "text" : 'Are you sure you wish to delete an entire project?',
              "showCancelButton" : true,
              "confirmButtonClass" : 'btn-danger',
              "type" : 'warning' }, function() {
        if ($scope.osaProjects[idx].id === id) /* Sanity test. */ {
          $scope.realDeleteProject(id);
          $scope.$apply(); /* This seems to be needed. */
        }
      });
    };

    $scope.createProject = function() {
      var id = uuid4.generate();
      $scope.osaProjects.push({ "id" : id });
      $localForage.bind($scope, { "key" : 'osaScenes-' + id, "scopeKey" : 'osaScenes[\'' + id + '\']', "defaultValue" : [] });
    };

    $scope.loadProject = function(project) {
      $scope.currentKeyframeId = null;
      $scope.currentElement = null;
      $scope.currentScene = null;
      $scope.currentProject = project;

      $scope.loadProjectIntoMemory(project);
    };

    $scope.createScene = function() {
      var id = uuid4.generate();
      $scope.osaScenes[$scope.currentProject.id].push({ "id" : id });
      $localForage.bind($scope, { "key" : 'osaKeyframes-' + id, "scopeKey" : 'osaKeyframes[\'' + id + '\']',  "defaultValue" : [] });
      $localForage.bind($scope, { "key" : 'osaElements-' + id, "scopeKey" : 'osaElements[\'' + id + '\']',  "defaultValue" : [] });
    };

    $scope.deleteScene = function(idx, id) {
      swal( { "title" : 'Delete Scene Confirmation',
              "text" : 'Are you sure you wish to delete an entire scene?',
              "showCancelButton" : true,
              "confirmButtonClass" : 'btn-danger',
              "type" : 'warning' }, function() {
        if ($scope.osaScenes[$scope.currentProject.id][idx].id === id) {
          $scope.realDeleteScene($scope.currentProject.id, id);
          $scope.$apply();
        }
     });
    };

    $scope.loadScene = function(scene) {
      $scope.currentKeyframeId = null;
      $scope.currentElement = null;
      $scope.currentScene = scene;
    };

    $scope.createKeyframe = function() {
      var id = uuid4.generate();
      $scope.osaKeyframes[$scope.currentScene.id].push({ "id" : id });
    };

    $scope.deleteKeyframe = function(idx, id) {
      swal( { "title" : 'Delete Keyframe Confirmation',
              "text" : 'Are you sure you wish to delete this keyframe?',
              "showCancelButton" : true,
              "confirmButtonClass" : 'btn-danger',
              "type" : 'warning' }, function() {
        if ($scope.osaKeyframes[$scope.currentScene.id][idx].id === id) {
          $scope.realDeleteKeyframe($scope.currentScene.id, id);
          $scope.$apply();
        }
      });
    };

    $scope.createElement = function() {
      var id = uuid4.generate();
      $scope.osaElements[$scope.currentScene.id].push({ "id" : id });
      $scope.osaElementKeyframeData[id] = {};
      $localForage.bind($scope, { key : 'osaData-' + id, scopeKey: 'osaElementKeyframeData[\'' + id + '\']', "defaultValue" : {} });
    };

    $scope.deleteElement = function(idx, id) {
      swal( { "title" : 'Delete Image Confirmation',
              "text" : 'Are you sure you wish to delete this image?',
              "showCancelButton" : true,
              "confirmButtonClass" : 'btn-danger',
              "type" : 'warning' }, function() {
        if ($scope.osaElements[$scope.currentScene.id][idx].id === id) {
          $scope.realDeleteElement($scope.currentScene.id, id);
          $scope.$apply();
        }
      });
    };

    $scope.loadElement = function(elem) {
      $scope.currentElement = elem;
    };

    $scope.createData = function(kfId) {
     if (angular.isDefined($scope.osaElementKeyframeData[$scope.currentElement.id][kfId])) {
         $scope.osaElementKeyframeData[$scope.currentElement.id][kfId].isOpen = !$scope.osaElementKeyframeData[$scope.currentElement.id][kfId].isOpen;
     }
     else {
       $scope.osaElementKeyframeData[$scope.currentElement.id][kfId] = { "id" : uuid4.generate(), "hasData" : {}, "isOpen" : true };
     }
    };

    $scope.destroyData = function(kfId, tag) {
      $scope.osaElementKeyframeData[$scope.currentElement.id][kfId].hasData[tag.name] = false;
      $scope.applyStyles(kfId);
    };

    $scope.applyStylesInternal = function(elem, kfId, kkfId, item, transforms) {

          if (angular.isDefined($scope.osaElementKeyframeData[elem.id][kfId]) &&
              $scope.osaElementKeyframeData[elem.id][kfId].hasData[item.name]) {
            var key = item.name;
            var value = $scope.osaElementKeyframeData[elem.id][kfId][item.name];

            if (item.isTransform) {
               transforms += item.name + '(' + value + item.unit + ') ';
            }
            else if (item.isAttr) {
               $('#' + elem.id).attr(item.name, value);
            }
            else {
               value = value + item.unit;
               $('#' + elem.id).css(key, value);
            }
          }

          return transforms;
    };

    $scope.applyStyles = function(kfId /* Which keyframe to stop at? */) {

      $scope.currentKeyframeId = kfId;

      /* First clear existing styles and attributes. */
      $.each($scope.osaElements[$scope.currentScene.id], function(idx, elem) {
       $.each($scope.allTags, function(idx, item) {
         if (item.isTransform)
          $('#' + elem.id).css('transform', '');
         else if (item.isAttr)
          $('#' + elem.id).attr(item.name, '');
         else
          $('#' + elem.id).css(item.name, '');
       });
      });

      /* Then loop through all the elements in the scene. */
      $.each($scope.osaElements[$scope.currentScene.id], function(idx, elem) {

        /* Apply the constant styles first. */
        $.each($scope.allTags, function(idx, item) {
          $scope.applyStylesInternal(elem, 'c', 'c', item);
        });

        if (kfId != 'c')
        {
         /* Apply the styles for other keyframes, stopping at kfId. */
         $.each($scope.osaKeyframes[$scope.currentScene.id], function(idx, kkf) {
          var transforms = '';
          $.each($scope.allTags, function(idx, item) {
            transforms = $scope.applyStylesInternal(elem, kkf.id, kfId, item, transforms);
          });

         if (transforms.length > 0)
           $('#' + elem.id).css('transform', transforms);

          if (kkf.id == kfId)
           return false;
         });
        }
      });
    };

    $scope.renderSkrollr = function() {
      $scope.realRender($scope.osaScenes[$scope.currentProject.id]);
    };

    /* This function loads all the scenes, keyframes, elements and element keyframe data into memory
     * for the given project. */
    $scope.loadProjectIntoMemory = function(project) {

     $localForage.bind($scope, { key : 'osaScenes-' + project.id, scopeKey: 'osaScenes[\'' + project.id + '\']' });

     $localForage.getItem('osaScenes-' + project.id).then(function(scenesM) {
       /* Iterate over all the scenes in the project. */
       $.each(scenesM, function(idx, scene) {
         $localForage.bind($scope, { key : 'osaKeyframes-' + scene.id, scopeKey: 'osaKeyframes[\'' + scene.id + '\']' });
         $localForage.bind($scope, { key : 'osaElements-' + scene.id, scopeKey: 'osaElements[\'' + scene.id + '\']' });

         /* Iterate over all the elements in the scene. */
         $localForage.getItem('osaElements-' + scene.id).then(function(elems) {
          $.each(elems, function(idx, elem) {
           $localForage.bind($scope, { key : 'osaData-' + elem.id, scopeKey: 'osaElementKeyframeData[\'' + elem.id + '\']' });
          });
         });
       });
     });
    };

    $scope.createDataAttribute = function(elemDiv, kfData, position, stats) {

      var transforms = '';
      var dataAttr = '';

      if (!kfData)
        return;

      $.each($scope.tags, function(idx, item) {
        if (kfData.hasData[item.name]) {
         if (!item.isTransform) {
           dataAttr += item.name + ':' + kfData[item.name] + item.unit + '; ';
         }
         else {
           transforms += item.name + '(' + kfData[item.name] + item.unit + ') ';
         }

         if (!stats.counts[item.name])
           stats.counts[item.name] = 1;
         else
           stats.counts[item.name]++;
        }
      });

      if (transforms.length > 0)
        dataAttr += 'transform:' + transforms + ';';

      elemDiv.attr('data-' + position, dataAttr);
    };

    /* Create the constant attributes and css for an img in the skrollr scene. */
    $scope.createConstants = function(elemDiv, kfData, stats) {
      var transforms = '';

      if (!kfData)
        return;

      $.each($scope.allTags, function(idx, item) {
         if (kfData.hasData[item.name]) {
            var key = item.name;
            var value = kfData[item.name];

            if (item.isTransform) {
               transforms += item.name + '(' + value + item.unit + ') ';
            }
            else if (item.isAttr) {
               elemDiv.attr(item.name, value);
            }
            else {
               value = value + item.unit;
               elemDiv.css(key, value);
            }

            stats.hasConstant[item.name] = true;
         }

         if (transforms.length > 0)
           elemDiv.css('transform', transforms);
      });
    };

    $scope.realRender = function(scenes) {

      $('#skrollr-container').empty();
      $scope.renderMode = true;

      var rollingScrollPosition = 0;
      var firstScene = true;
      $scope.osaErrors = [];

      $.each(scenes, function(idx, scene) {
        var sceneDiv = $('<div />');
        var sceneStart = rollingScrollPosition;

        sceneDiv.css({ "position" : 'fixed', "width" : '100%', "height" : '100%', "top" : 0, "left" : 0 });
        if (!firstScene) {
          sceneDiv.attr('data-' + (sceneStart - 1), 'opacity:0;');
          sceneDiv.attr('data-' + (sceneStart), 'opacity:1;');
        }
        else {
          firstScene = false;
        }

        $.each($scope.osaElements[scene.id], function(idx, elem) {
          var elemDiv = $('<img />');
          elemDiv.css('position', 'absolute');

          var stats = { "hasConstant" : {}, "counts" : {} };

          $scope.createConstants(elemDiv, $scope.osaElementKeyframeData[elem.id]['c'], stats);

          var keyframesOrdered = $filter('orderBy')($scope.osaKeyframes[scene.id], function(dt) { return parseInt(dt.position); });

          $.each(keyframesOrdered, function(idx, kf) {
            var kfData = $scope.osaElementKeyframeData[elem.id][kf.id];
            $scope.createDataAttribute(elemDiv, kfData, kf.position + sceneStart, stats);
            rollingScrollPosition = kf.position + sceneStart;
          });

          $scope.reportErrors(stats, elem, scene);

          sceneDiv.append(elemDiv);
        });

        sceneDiv.attr('data-' + (rollingScrollPosition), 'opacity:1;');
        sceneDiv.attr('data-' + (rollingScrollPosition + 1), 'opacity:0;');
        rollingScrollPosition += 2; /* 1px at start and end. */

        $('#skrollr-container').append(sceneDiv);
      });
      skrollr.get().refresh();
    };

    $scope.reportErrors = function(stats, elem, scene) {

      $.each($scope.allTags, function(idx, tag) {

       if (stats.hasConstant[tag.name] && stats.counts[tag.name])
         $scope.osaErrors.push({
           "text" : 'You have defined a property as a constant as well as in a keyframe. This will not work.',
           "tag" : tag.name,
           "element" : elem.name,
           "scene" : scene.name
         });

       if (stats.counts[tag.name] && stats.counts[tag.name] < 2)
         $scope.osaErrors.push({
           "text" : 'You have defined a property in a single keyframe. Animations run between two or more keyframes so this will not work.',
           "tag" : tag.name,
           "element" : elem.name,
           "scene" : scene.name
         });
      });
    };

    $scope.showErrorsTab = function() {
      $('a[href="#error-menu-tab"]').tab('show');
      $scope.renderMode = false;
    };

    $scope.saveRender = function() {
      $scope.renderMode = false;

      var header = '<' + '!DOCTYPE html>'
      header += '<' + 'html>\n';
      header += '<' + 'head>\n';
      header += '<' + 'title>\n';
      header += $('<div />').text($scope.currentProject.name).html();
      header += '<' + '/title>\n';
      header += '<' + 'script src="skrollr.min.js">' + '<' + '/script>\n';
      header += '<' + '/head>\n';
      header += '<' + 'body>\n';

      footer = '<' + 'script' + '>skrollr.init();' + '<' + '/script>\n';
      footer += '<' + '/body>\n';
      footer += '<' + '/html>\n';

      skrollr.get().destroy();
      var blob = new Blob([header + $('#skrollr-container').html() + footer], {type: "text/html;charset=utf-8"});
      saveAs(blob, $scope.currentProject.name + '.htm');
      skrollr.init();
    };

    $scope.saveJSON = function() {
      $scope.v1SaveJSON();
    };

    $scope.v1SaveJSON = function() {
      var save = { "id" : uuid4.generate(), "version" : 1, "generatedBy" : 'Easy Skrollr Animate',
                   "generatorLink" : 'TODO' };

      save.project = $scope.currentProject;
      save.scenes = $scope.osaScenes[$scope.currentProject.id];
      save.keyframes = {};
      save.elements = {};
      save.kfData = {};
      save.note = $scope.saveNote;

      $.each(save.scenes, function(idx, scene) {
        save.keyframes[scene.id] = $scope.osaKeyframes[scene.id];
        save.elements[scene.id] = $scope.osaElements[scene.id];

        $.each(save.elements[scene.id], function(idx, elem) {
          save.kfData[elem.id] = $scope.osaElementKeyframeData[elem.id];
        });
      });

      var blob = new Blob([angular.toJson(save)], {type: "application/json;charset=utf-8"});
      saveAs(blob, $scope.currentProject.name + '.json');
    };

    $scope.realLoadJSON = function(data) {
      var load = angular.fromJson(data);

      if (!load.generatedBy ||
          load.generatedBy !== 'Easy Skrollr Animate' ||
          load.version !== 1) {
        swal( { "title" : 'Wrong application or version',
              "text" : 'Unfortunately, the file you have provided could not be opened by this version of Easy Skrollr Animate.',
              "showCancelButton" : false,
              "confirmButtonClass" : 'btn-warning',
              "type" : 'warning' });
        return;
      }
      else {
        swal( { "title" : 'Opening project',
              "text" : (load.note && load.note.length ? 'Project Note: ' + load.note : ''),
              "showCancelButton" : false,
              "confirmButtonClass" : 'btn-info',
              "type" : 'success' });
      }

      $scope.v1LoadJSON(load);
    };

    $scope.v1LoadJSON = function(load) {
      save = {};
      save.project = angular.copy(load.project);
      save.project.id = uuid4.generate();

      /* First we generate new ids for everything to avoid overwriting any existing projects, etc. */
      save.scenes = [];
      save.keyframes = {};
      save.elements = {};
      save.kfData = {};

      $.each(load.scenes, function(idx, scene) {
        var newScene = angular.copy(scene);
        newScene.id = uuid4.generate();

        save.keyframes[newScene.id] = [];
        save.elements[newScene.id] = [];

        $.each(load.keyframes[scene.id], function(idx, kf) {
          var newKf = angular.copy(kf);
          newKf.id = uuid4.generate();
          kf.newId = newKf.id;
          save.keyframes[newScene.id].push(newKf);
        });

        $.each(load.elements[scene.id], function(idx, elem) {
          var newElem = angular.copy(elem);
          newElem.id = uuid4.generate();
          elem.newId = newElem.id;
          save.elements[newScene.id].push(newElem);
        });

        $.each(load.elements[scene.id], function(idx, elem) {
          save.kfData[elem.newId] = {};

          if (load.kfData[elem.id]['c']) {
            save.kfData[elem.newId]['c'] = angular.copy(load.kfData[elem.id]['c']);
            save.kfData[elem.newId]['c'].id = uuid4.generate();
          }

          $.each(load.keyframes[scene.id], function(idx, kf) {
            if (load.kfData[elem.id] && load.kfData[elem.id][kf.id]) {
              save.kfData[elem.newId][kf.newId] = angular.copy(load.kfData[elem.id][kf.id]);
              save.kfData[elem.newId][kf.newId].id = uuid4.generate();
            }
          });
        });

        save.scenes.push(newScene);
      });

      $scope.currentKeyframeId = null;
      $scope.currentElement = null;
      $scope.currentScene = null;
      $scope.currentProject = save.project;

      $scope.osaProjects.push(save.project);

      $scope.osaScenes[save.project.id] = save.scenes;
      $localForage.bind($scope, { "key" : 'osaScenes-' + save.project.id, "scopeKey" : 'osaScenes[\'' + save.project.id + '\']' });

      $.each(save.scenes, function(idx, scene) {
        $scope.osaKeyframes[scene.id] = save.keyframes[scene.id];
        $scope.osaElements[scene.id] = save.elements[scene.id];

        $localForage.bind($scope, { "key" : 'osaKeyframes-' + scene.id, "scopeKey" : 'osaKeyframes[\'' + scene.id + '\']' });
        $localForage.bind($scope, { "key" : 'osaElements-' + scene.id, "scopeKey" : 'osaElements[\'' + scene.id + '\']' });

        $.each(save.elements[scene.id], function(idx, elem) {
          $scope.osaElementKeyframeData[elem.id] = save.kfData[elem.id];
          $localForage.bind($scope, { key : 'osaData-' + elem.id, scopeKey: 'osaElementKeyframeData[\'' + elem.id + '\']' });
        });
      });
    };

    $scope.loadJSON = function() {
      var file = $('#load-file-box')[0].files[0];

      if (!file)
        return;

      var reader = new FileReader();
      reader.onload = function() { $scope.realLoadJSON(this.result); };
      reader.readAsText(file);
    };

    $scope.loadSample = function() {
      $scope.loadingData = true;

      $http.get('sample.json').success(function(data, status) {
        $scope.loadingData = false;
        $scope.realLoadJSON(data);
      });
    };
  }]);

  skrollr.init();

