var bindAll = require('lodash/function/bindAll'),
  augment = require('./vendor/augment'),
  glmatrix = require('./vendor/gl-matrix'),
  Rectangle = require('./math/rectangle'),
  Point = require('./math/point'),
  CameraPan = require('./camera-pan');

var mat2d = glmatrix.mat2d;

var MinimapNavigator = augment.defclass({
  constructor: function(minimap){
    bindAll(this);

    this.minimap = minimap;
    minimap.interactive = true;
    minimap.on('mousedown', this.handleMouseDown);
    
    this.camera = this.minimap.camera;
    this.cameraPan = new CameraPan(this.minimap.camera);
  },
  handleMouseDown: function(eventData){
    var obj = this.minimap;
    obj.mouseup = obj.mouseupoutside = obj.touchend = obj.touchendoutside = this.handleMouseUp;
    obj.mousemove = this.handleMouseMove;
    
    var position = this.mouseToGlobal(eventData.data.global)
    this.cameraPan.startAt( -position.x, -position.y);
  },

  handleMouseUp: function(data){
    var obj = this.minimap;
    obj.mouseup = obj.mouseupoutside = obj.touchend = obj.touchendoutside = undefined;
    obj.mousemove = undefined;
    
    this.cameraPan.end();
  },

  mouseToGlobal: function(global){
    var position = this.minimap.toLocal( global);
    position = new Point(position.x, position.y);
    position = this.minimap.minimapToWorld(position);

    return position;
  },

  handleMouseMove: function(eventData){
    var position = this.mouseToGlobal(eventData.data.global)
    this.cameraPan.applyPan(-position.x, -position.y);
  },
  
  update: function(){
    this.cameraPan.update();
  }
});

module.exports = MinimapNavigator;
