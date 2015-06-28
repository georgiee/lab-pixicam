var bindAll = require('lodash/function/bindAll'),
  augment = require('./vendor/augment'),
  glmatrix = require('./vendor/gl-matrix'),
  Rectangle = require('./math/rectangle'),
  Point = require('./math/point');

var CameraConstrains = augment.defclass({
  constructor: function(options){
    this.maxZoom = options.maxZoom || 5;
    this.minZoom = options.minZoom || 0.1;
    this.worldBounds = options.worldBounds;
  },

  clampZoom: function(zoom){
    if(zoom > this.maxZoom){
      return this.maxZoom;
    }
    if(zoom < this.minZoom){
      return this.minZoom;
    }

    return zoom;
  },
  
  limitToWorld: function(camera){
    var point = new Point();
    var viewport = camera.getViewport();
    var worldBounds = this.worldBounds;

    if(viewport.y + viewport.height > worldBounds.y + worldBounds.height){
      var limit = camera.y + ((worldBounds.y + worldBounds.height) - (viewport.y + viewport.height));
      camera.y =  limit;
    }
    

    if(viewport.x < worldBounds.x){
      var limit = camera.x + (worldBounds.x - viewport.x);
      camera.x =  limit;
    }
    
    if(viewport.x + viewport.width > worldBounds.x + worldBounds.width){
      var limit = camera.x + ((worldBounds.x + worldBounds.width) - (viewport.x + viewport.width));
      camera.x =  limit;
    }
    
    if(viewport.y < worldBounds.y){
      var limit = camera.y + (worldBounds.y - viewport.y);
      camera.y =  limit;
    }
  },

  update: function(camera){
    camera.zoom = this.clampZoom(camera.zoom);
    this.limitToWorld(camera);
  }
});

module.exports = CameraConstrains;