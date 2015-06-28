var gui = new dat.GUI();

params = {
  world: {
    width: 5000,
    height: 000
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



var stageWidth = 500, stageHeight = 500;

var renderer = PIXI.autoDetectRenderer(stageWidth, stageHeight, { transparent : false, backgroundColor:0xaaaaaa }, false);
var stage = new PIXI.Container();

//pixicam.mixins.create();

var options = {
  screenWidth: stageWidth,
  screenHeight: stageHeight,
  width: 5000,
  height: 500,
  centerX: -500,
  centerY: -500
}

var world = new pixicam.World(options);
world.setScreenSize(500, 500);
world.setSize(5000,1000);
world.setCenter(0,0);

var camera = world.camera;

var test = new PIXI.Graphics();
test.beginFill(0xff0000);
test.drawRect(0,0,100,100);
world.addChild(test);

stage.addChild(world);


var minimap = new pixicam.Minimap(300, 150, camera);
minimap.setWorldBounds(world.worldRectangle);

stage.addChild(minimap);

var update = function(){
  params.camera.x = camera.x;
  params.camera.y = camera.y;
  
  world.update();
  minimap.update();
  
  renderer.render(stage);
  requestAnimationFrame(update);
}

update();

document.body.appendChild(renderer.view);