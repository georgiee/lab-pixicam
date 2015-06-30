// The most basic example which creates a camera that loops between a defined horizontal range

params = {
  stage: {
    width: 900,
    height: 500
  },

  world: {
    x: -500,
    width: 5000,
    height: 1000
  }
}

var direction = 1;
var renderer, stage, camera, world;

var init = function(){
  renderer = PIXI.autoDetectRenderer(params.stage.width, params.stage.height, { transparent : false, backgroundColor:0xaaaaaa }, false);
  document.body.appendChild(renderer.view);

  stage = new PIXI.Container();

  world = new pixicam.World({
    screenWidth: params.stage.width,
    screenHeight: params.stage.height,
    width: params.world.width,
    height: params.world.height,
    x: params.world.x
  });

  camera = world.camera;
  stage.addChild(world);
}

var build = function(resources){
  var frame = PIXI.Texture.fromFrame("kenny/flat/pointy_mountains");
  var tiling = new PIXI.extras.TilingSprite(frame, 2000, frame.height);
  tiling.pivot.set(0,frame.height);
  tiling.tint = 0xc5c5c5;

  world.addChild(tiling);
  
  //display the world's center point
  var origin = new PIXI.Sprite(resources.origin.texture);
  origin.anchor.set(0.5);
  world.addChild(origin);
}

var speed = 11;
var update = function(){
  
  camera.x += direction * speed; 
  
  if(camera.x > 1500 || camera.x < 0){
    direction *= -1;
  }
  
  world.update();
  renderer.render(stage);

  requestAnimationFrame(update);
}

var preload = function(){
  var loader = PIXI.loader
  .add('origin',"assets/origin.png")
  .add('kenny','assets/kenny.json')
  .load(function(loader){
    build(loader.resources);
    update();
  });
}

init();
preload();
