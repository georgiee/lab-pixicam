define(['augment','underscore','debug/panel'], function(augment, _, debugPanel){

  var CameraDebug = augment.defclass({
    constructor: function(camera){
      this.camera = camera;
      this.applyParameters = _.bind(this.applyParameters, this);
      
      this.init();
    },
    
    init: function(){
      debugPanel.listeners.controlCameraZoom.onChange(this.applyParameters);
      debugPanel.listeners.controlCameraX.onChange(this.applyParameters);
      debugPanel.listeners.controlCameraY.onChange(this.applyParameters);
      
      debugPanel.listeners.controlCameraPivotX.onChange(this.applyParameters);
      debugPanel.listeners.controlCameraPivotY.onChange(this.applyParameters);
    },
    
    readCamera: function(){
      debugPanel.params.camera.x = this.camera.view.x;
      debugPanel.params.camera.y = this.camera.view.y;
      debugPanel.params.camera.zoom = this.camera.zoom;
    },

    applyParameters: function(){
      this.camera.position = debugPanel.params.camera;
      this.camera.zoom = debugPanel.params.camera.zoom;
      
      this.camera.zoomPivotX = debugPanel.params.camera.zoomPivotX;
      this.camera.zoomPivotY = debugPanel.params.camera.zoomPivotY;
    }
  });

  return CameraDebug;
})