define(['augment','underscore', 'game/game-session', 'vendor/gl-matrix', 'camera/controls/scroll-momentum', 'vendor/jquery.mousewheel','debug/panel','camera/camera-debug','camera/camera-constrains','camera/controls/camera-pan'], function(augment, _, gameSession, glmatrix, ScrollMomentum, mousewheel, debugPanel, CameraDebug, CameraConstrains, CameraPan){

  var vec2 = glmatrix.vec2;
  var STATE = { NONE : -1, PAN : 2};

  var CameraControl = augment.defclass({
    constructor: function(camera, domElement, worldBounds){
      _.bindAll(this);
      this.worldBounds = worldBounds;

      this.camera = camera;
      this.cameraPan = new CameraPan(this.camera);

      this.cameraConstrains = new CameraConstrains({
        maxZoom: 3,
        minZoom: 0.5,
        worldBounds: worldBounds
      });

      this.initPanHandler(domElement);
      this.initWheelHandler(domElement);
      
      this.initDebug();
    },
    
    initDebug: function(){
      this.cameraDebug = new CameraDebug(this.camera);
    },

    initWheelHandler: function(domElement){
      $(domElement).on('mousewheel', this.handleMouseWheel);
    },

    initPanHandler: function(domElement){
      this.hammer = gameSession.hammer;
      this.hammer.on("panstart", this.handlePanStart);
      this.hammer.on("pan", this.handlePan);
      this.hammer.on("panend", this.handlePanEnd);
    },

    handleMouseWheel: function(event){
      event.preventDefault();
      this.camera.zoom += event.deltaY * 0.01;

      if(debugPanel.params.camera.constrain){
        this.cameraConstrains.update(this.camera);
      }
    },

    handlePanStart: function(ev){
      //if(!debugPanel.params.camera.allowPan) return;
      //if(!gameSession.game.input.isDown('space') && !debugPanel.params.camera.alwaysPan) return;

      this.cameraPan.startAt( ev.center.x, ev.center.y);
      gameSession.game.camera.unfollow();
    },
    
    handlePan: function(ev){
      this.cameraPan.applyPan(ev.center.x, ev.center.y);
    },

    handlePanEnd: function(ev){
      this.cameraPan.end();
    },
    
    update: function(){
      this.cameraPan.update();
      if(debugPanel.params.camera.constrain){
        this.cameraConstrains.update(this.camera);
      }
      this.cameraDebug.readCamera();
    }
  });

  return CameraControl;
})