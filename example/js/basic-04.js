var gui = new dat.GUI();

params = {

  stage: {
    width: 900,
    height: 500
  },

  world: {
    width: 5000,
    height: 1000
  },
  
  camera: {
    zoom: 1,
    x:0,
    y:0
  }
}

var updateDebug = function(){
  camera.x = params.camera.x;
  camera.y = params.camera.y;
  camera.zoom = params.camera.zoom;
}

var listener = gui.add(params.world, 'width',0,10000).name('World Width');
listener.onChange(updateDebug);
listener = gui.add(params.world, 'height',0,10000).name('World Height');
listener.onChange(updateDebug);
listener = gui.add(params.camera, 'zoom',0.1,3).name('Zoom');
listener.onChange(updateDebug);
listener = gui.add(params.camera, 'x', -5000, 10000).name('Camera X').listen();
listener.onChange(updateDebug);
listener = gui.add(params.camera, 'y', -5000, 10000).name('Camera Y').listen();
listener.onChange(updateDebug);


var updateDebugStage = function(){
  resize(params.stage.width, params.stage.height);
}

var debugStageSize = gui.add(params.stage, 'width', 100, 2000).name('Stage Width');
debugStageSize.onChange(updateDebugStage);
debugStageSize = gui.add(params.stage, 'height', 100, 2000).name('Stage Height');
debugStageSize.onChange(updateDebugStage);



var renderer = PIXI.autoDetectRenderer(params.stage.width, params.stage.height, { transparent : false, backgroundColor:0xaaaaaa }, false);
var stage = new PIXI.Container();
//pixicam.mixins.create();

var options = {
  screenWidth: params.stage.width,
  screenHeight: params.stage.height,
  width: 5000,
  height: 500
}



var world = new pixicam.World(options);
world.setScreenSize(500, 500);
world.setSize(5000,1000);
//world.setCenter(0,0);
stage.addChild(world);

var camera = world.camera;



var resize = function(stageWidth, stageHeight){
  renderer.resize(stageWidth, stageHeight);
}

var update = function(){

  world.update();
  //minimap.update();
  
  renderer.render(stage);
  requestAnimationFrame(update);
  
  params.camera.x = camera.x;
  params.camera.y = camera.y;
  params.camera.zoom = camera.zoom;
}

resize(params.stage.width, params.stage.height);


var build = function(resources){
  pixicam.World.mixinUpdates();
  var origin = new PIXI.Sprite(resources.origin.texture);
  origin.anchor.set(0.5);
  world.addChild(origin);

  var tree = PIXI.Sprite.fromFrame('kenny/tree30');
  tree.anchor.set(0,1);
  world.addChild(tree);

  var frame = PIXI.Texture.fromFrame("kenny/flat/pointy_mountains");
  
  var tiling = new PIXI.extras.TilingSprite(frame, 2000, frame.height);
  tiling.pivot.set(0,frame.height);
  tiling.tint = 0xc5c5c5;

  world.addChild(tiling);
}

var loader = PIXI.loader
.add('origin',"assets/origin.png")
.add('kenny','assets/kenny.json')
.load(function(loader){
  build(loader.resources);
  update();

});

document.body.appendChild(renderer.view);