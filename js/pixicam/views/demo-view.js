define(['underscore','jquery','pixi','game/background','utils/rectangle','game','camera-tests','debug/stats-instance', 'debug/panel','gsap'], 
  function(_, $, PIXI, Background, Rectangle, Game, CameraTests, statsInstance, debugPanel, gsap){
  
  PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST
  
  var TweenMax = gsap.TweenMax;
  var TimelineMax = gsap.TimelineMax;

  var game, renderer, stage, world, ufo;
  debugPanel.initialize();

  var addKennyObject = function(frame, position, anchor){
    var object = PIXI.Sprite.fromFrame(frame);
    object.anchor.set(anchor[0], anchor[1]);
    object.position.set(position[0], position[1]);
    world.addChild(object);

    return object;
  }

  var createCameraTest = function(targets){
     var zoomTargets = {
      nothing: -1,
      castle: 'castle',
      house: 'house',
      trees: 'tree',
      ufo: 'ufo'
    }

    var params = {
      zoomTo: 'not selected',
      followTarget: 'not selected'
    }
    
    var zoomToListener = debugPanel.folders.camera.add(params, "zoomTo", zoomTargets).name('zoom To').listen();
    var followTargetListener = debugPanel.folders.camera.add(params, "followTarget", zoomTargets).name('follow').listen();
    
    followTargetListener.onChange(function(object){
      if(object < 0){
        game.camera.unfollow();
        return;
      }
      
      game.camera.follow(targets[object]);
    })

    zoomToListener.onChange(function(object){
      if(object < 0) return;
      params.followTarget = 'not selected';
      game.camera.unfollow();

      var item = targets[object]
      game.cameraFocus.focusOn(item)
      .then(function(){
        console.log('end!')
      })
    })
  }

  var build = function(resources){
    debugPanel.params.camera.zoomPivotX = game.width/2;
    debugPanel.params.camera.zoomPivotY = game.height/2;
    
    game.start();

    world = game.world;
    world.camera.y = -100;

    background = new Background(game.width, game.height, game.worldBounds);
    world.addChild(background);
    var object;

    addKennyObject('kenny/tree30',[0,0],[0,1]);
    addKennyObject('kenny/tree03',[1500,0],[0,1]);
    addKennyObject('kenny/tree04',[1600,5],[0,1]);
    addKennyObject('kenny/tree06',[2200,0],[0,1]);


    addKennyObject('kenny/tree05',[2000,5],[0,1]);
    var tree = addKennyObject('kenny/tree07',[2070,0],[0,1]);
    addKennyObject('kenny/grass2',[2070,5],[0,1]);


    var house = addKennyObject('kenny/house_grey_front',[120,0],[0,1]);
    var castle = addKennyObject('kenny/castle_grey',[4070,5],[0,1]);

    var fence = PIXI.extras.TilingSprite.fromFrame('kenny/fence', 500, 88);
    fence.x = 250;
    fence.anchor.set(0,1);
    world.addChild(fence);
    
    ufo = addKennyObject('kenny/shipPink_manned',[0,0],[0,1]);

    //game.cameraFocus.focusOn(castle);

    var objects = {
      tree:tree,
      house:house,
      castle:castle,
      ufo: ufo
    }
    
    createCameraTest(objects);

    TweenMax.to(ufo, 20, {
      repeat: -1,
      bezier:{
        type:"soft", 
        values:[{ x:150, y:300}, {x:300, y:-10}, {x:1500 + Math.random() *100, y:320*Math.random() + 50}, {x:1650, y:320*Math.random() + 50}, {x:900, y:-80}, {x:0, y:0}], 
      }
    });

  }
  
  return {
    run: function(){

      game = new Game(900, 500, {
        worldBounds: new Rectangle(-500, -1200, 5000, 1500)
      });

      $('#stage').append(game.renderer.view);

      var loader = PIXI.loader
      .add('origin',"assets/images/origin.png")
      .add('kenny','spritesheets/kenny.json')
      .load(function(loader){
        build(loader.resources)
      });
    }
  };
});