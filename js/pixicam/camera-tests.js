define(['debug/panel'], function(debugPanel){
  var run = function(game, state){
    var zoomTargets = {
      nothing: -1,
      birdRed: 0,
      birdYellow: 1,
      pillar: 2
    }

    var params = {
      zoomTo: 'not selected',
      followTarget: 'not selected'
    }
    
    var targets = [state.birdRed, state.birdYellow, state.pillar]
    var zoomToListener = debugPanel.gui.add(params, "zoomTo", zoomTargets).name('zoom To').listen();
    var followTargetListener = debugPanel.gui.add(params, "followTarget", zoomTargets).name('follow').listen();
    
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


  return {
    run: run
  }
})