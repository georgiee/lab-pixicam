define(['augment', 'underscore', 'pixi','core/camera','camera/controls/camera-control','core/world','views/minimap','game/game-session','camera/controls/camera-focus', 'debug/panel'],
  function(augment, _, PIXI, Camera, CameraControl, World, Minimap, gameSession, CameraFocus, debugPanel){
  
  var Game = augment.defclass({
    constructor: function(width, height, options){
      this.worldBounds = options.worldBounds;
      this.width = width;
      this.height = height;

      _.bindAll(this);
      
      this.build();
      this.resize();
    },
    
    resize: function(){
      var deviceWidth = window.screen.width;
      var deviceHeight = window.screen.height;  
      
      if(deviceHeight > deviceWidth){
        //deviceWidth = window.screen.height;
        //deviceHeight = window.screen.width;  
      }
      
      var width = deviceWidth;
      var height = deviceHeight;
      
      width = Math.min(this.width, deviceWidth);
      height = Math.min(this.height, deviceHeight);
      
      var canvas = this.renderer.view;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      
      this.renderer.resize(width, height);
    },

    build: function(){
      this.renderer = PIXI.autoDetectRenderer(this.width, this.height, { transparent : false, backgroundColor:0xaaaaaa }, false);
      this.stage = new PIXI.Container();
      
      gameSession.init(this);
      gameSession.renderer = this.renderer;
      gameSession.interactive = this.renderer.plugins.interaction;

      this.createCamera();
      this.createCameraWorld();
      this.createMinimap();

      this.cameraControl = new CameraControl(this.camera, this.renderer.view, this.worldBounds);
      this.cameraFocus = new CameraFocus(this.camera);
    },
    
    start: function(){
      this.update();
    },
    
    createCameraWorld: function(){
      this.world = new World(this.camera);
      this.stage.addChild(this.world);
    },

    createMinimap: function(){
      var minimap = new Minimap(300,150, this.camera);
      this.stage.addChild(minimap);
      
      debugPanel.listeners.controlMinimap.onChange(function(value){
        minimap.visible = value;
      });
      
      minimap.visible = debugPanel.params.minimap;
      this.minimap = minimap;

      minimap.position.set(this.width - minimap.width, this.height-minimap.height)
      minimap.setWorldBounds(this.worldBounds);
    },

    createCamera: function(){
      var camera = new Camera(this.width, this.height);
      camera.viewCenterX = camera.zoomPivotX = this.width/2;
      camera.viewCenterY = camera.zoomPivotY = this.height/2;
      this.camera = camera;
    },

    update: function(){

      //pre updates
      this.stage.preUpdate();
      
      this.minimap.update();
      this.cameraControl.update();
      this.camera.update();
      this.world.update();
      
      this.stage.postUpdate();
      
      gameSession.stats.update();
      this.renderer.render(this.stage);
      
      requestAnimationFrame(this.update);
    }

  });

  return Game;
});