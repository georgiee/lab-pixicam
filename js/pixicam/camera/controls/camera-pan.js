define(['augment','underscore', 'game/game-session', 'vendor/gl-matrix', 'camera/controls/scroll-momentum', 'vendor/jquery.mousewheel','debug/panel','camera/camera-debug','camera/camera-constrains'], function(augment, _, gameSession, glmatrix, ScrollMomentum, mousewheel, debugPanel, CameraDebug, CameraConstrains){

  var vec2 = glmatrix.vec2;
  var STATE = { NONE : -1, PAN : 2};

  var CameraPan = augment.defclass({
    constructor: function(camera){
      _.bindAll(this);

      this.camera = camera;
      
      this.state = STATE.NONE;
      this.panStart = vec2.fromValues(0,0);
      this.panEnd = vec2.fromValues(0,0);
      this.panDelta = vec2.fromValues(0,0);
      this.panCamera = vec2.fromValues(0,0);
    },

    startAt: function(x, y){
      this.state = STATE.PAN;
      vec2.set(this.panStart, x, y);

    },

    end: function(){
      this.state = STATE.NONE;
    },

    pan: function(dx, dy, speed){
      if(this.state == STATE.NONE) return;
      
      speed = speed || 1;
      this.panLeft( dx * speed);
      this.panUp( dy * speed);
    },
    
    panLeft : function(distance){
      this.panCamera[0] = distance;
    },
    
    panUp : function(distance){
      this.panCamera[1] = distance;
    },

    applyPan: function(x,y, speed){
      vec2.set(this.panEnd, x, y);
      vec2.subtract(this.panDelta, this.panStart, this.panEnd);
      this.pan(this.panDelta[0], this.panDelta[1], this.camera.zoom);
      vec2.copy(this.panStart, this.panEnd);
    },
    
    update: function(){
      var zoom = this.camera.zoom;
      this.camera.x += this.panCamera[0]/zoom;
      this.camera.y += this.panCamera[1]/zoom;
      vec2.set(this.panCamera, 0, 0);
    }
  });

  return CameraPan;
})