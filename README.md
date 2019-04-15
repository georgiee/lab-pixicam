# PIXICAM
➡️ **Important Note**:<br>
This project was fun to build back in the days (~4 years now 😬). I doubt that anyone (including me) can make this project run with the current pixi version easily or extend it as I used `augment` (there was no es6 yet 👀).

I recommend that you check out the following projects if you need a camera/viewport in pixi.


+ [Pixi Viewport](https://github.com/davidfig/pixi-viewport) 
+ Phaser 3 has [camera support](http://labs.phaser.io/view.html?src=src\camera\minimap%20camera.js) built-in

---

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

var world = new pixicam.World(options);
world.setScreenSize(500, 500);
world.setSize(5000,1000);
world.setCenter(0,0);

var camera = world.camera;
//now move and zoom the camera

```

