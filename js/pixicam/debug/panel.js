define(["vendor/dat.gui"], function(gui) {
  var game, gui;
  var listeners = {}, folder;

  gui = new dat.GUI();

  //dat.GUI.toggleHide();
  
  var params = {
    minimap: true,
    camera: {
      constrain: true,
      zoom: 1,
      x:0,
      y:0,
      zoomPivotX: 0,
      zoomPivotY: 0,
    }
  }
  
  var folders = {};
  
  return{
    gui: gui,
    params: params,
    listeners: listeners,
    folders: folders,
    
    initialize: function(){
      listeners.controlMinimap = gui.add(params, 'minimap').name('Show Minimap');
      
      folder = gui.addFolder('Camera');
      folder.closed = false;

      folder.add(params.camera, 'constrain').name('Constrain').listen();
      folders.camera = folder;

      listeners.controlCameraZoom = folder.add(params.camera, 'zoom', 0.1, 10.0, 0.01).name('Zoom').listen();
      listeners.controlCameraX = folder.add(params.camera, 'x', -1000, 5000).step(10).name('X').listen();
      listeners.controlCameraY = folder.add(params.camera, 'y', -1000, 5000).step(10).name('Y').listen();
      
      listeners.controlCameraPivotX = folder.add(params.camera, 'zoomPivotX', 0, 900).name('Zoom Pivot X').listen();
      listeners.controlCameraPivotY = folder.add(params.camera, 'zoomPivotY', 0, 500).name('Zoom Pivot Y').listen();
    }
  }
});