# PIXICAM
A world container which can be viewed through an accompanying camera.

See here:  
[Preview](http://georgiee.github.io/lab-pixicam/)

Usage:

```

var options = {
  screenWidth: 5000,
  screenHeight: 700,
  width: 5000,
  height: 500,
  centerX: 0,
  centerY: 0
}

var world = new pixicam.World(worldSize);
world.setScreenSize(500, 500);
world.setSize(5000,1000);
world.setCenter(0,0);

var camera = world.camera;
//now move and zoom the camera

```

