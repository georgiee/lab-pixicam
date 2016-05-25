define(['augment','pixi','underscore','utils/point','utils/rectangle','game/game-session','game/background-layer'],
  function(augment, PIXI, _, Point, Rectangle, GameSession, BackgroundLayer){
  
  var Background = augment(PIXI.Container, function(uber){
    this.constructor = function(width, height, worldBounds){
      uber.constructor.apply(this, arguments);
      this.worldBounds = worldBounds;
      this.screenWidth = width;
      this.screenHeight = height;
      this.layers = []
      this.build();
    }
    
    this.build = function(){
      var layer;
      var skyHeight = -this.worldBounds.y;

      //sky
      this.addLayer("kenny/flat/clouds2",{
        anchor: [0,1],
        z: 900,
        offsetY: -80,
        height: skyHeight,
        fillColor: 0x92ccde
      });

      //mountains
      this.addLayer("kenny/flat/pointy_mountains",{
        anchor: [0,1],
        tint: 0xc5c5c5,
        z: 800,
        offsetY: -80,
        height: skyHeight
      });

      //middle
      this.addLayer("kenny/flat/hills2",{
        tint: 0xd4e7c5,
        anchor: [0,1],
        offsetY: -30,
        z: 350,
        height: 5
      });

      //front
      this.addLayer("kenny/flat/hills1",{
        tint: 0xb8d0a6,
        fillColor: 0x9ac1a1,
        fillSize: new Rectangle(0,-28,this.screenWidth,this.screenHeight),
        anchor: [0,0],
        offsetY: -128,
        z: 50,
        height: -this.worldBounds.y
      });


      this.addLayer("kenny/flat/hills1",{
        tint: 0xb8d0a6,
        fillColor: 0x9ac1a1,
        fillSize: new Rectangle(0,-28,this.screenWidth,this.screenHeight),
        anchor: [0,0],
        offsetY: -128,
        z: 50,
        height: -this.worldBounds.y
      });
    }
    
    this.addLayer = function(frame, options){
      var layer = new BackgroundLayer(frame, _.defaults(options, { width: this.screenWidth, height: this.screenHeight }) );
      this.addChild(layer);
      this.layers.push(layer);

      return layer;
    }

    this.update = function(){
      var layer, camera = GameSession.game.camera;

      for(var i = 0, l = this.layers.length; i < l; i++){
        layer = this.layers[i];
        layer.update(camera);
      }
    }
  });

  return Background;
})