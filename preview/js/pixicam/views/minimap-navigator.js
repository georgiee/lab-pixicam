define(['augment','underscore','utils/point','camera/controls/camera-pan','game/game-session'], function(augment, _, Point, CameraPan, gameSession){
  var MinimapNavigator = augment.defclass({
    constructor: function(minimap){
      _.bindAll(this);

      this.minimap = minimap;
      minimap.interactive = true;
      minimap.on('mousedown', this.handleMouseDown);
      
      this.camera = this.minimap.camera;
      this.cameraPan = new CameraPan(this.minimap.camera);
    },
    handleMouseDown: function(eventData){
      gameSession.hammer.stop();

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

  return MinimapNavigator;
});