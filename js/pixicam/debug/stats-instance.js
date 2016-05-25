define(['stats', 'environment'], function(Stats, environment){
  // add fps counter
  var s = new Stats();
  s.setMode(0);
  
  s.domElement.style.position = 'absolute';
  s.domElement.style.right = '0px';
  s.domElement.style.bottom = '0px';

  if(environment.development){
    document.body.appendChild( s.domElement );  
  }

  return s;
})