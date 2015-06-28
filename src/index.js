var core = module.exports = {
  Camera: require('./camera'),
  World: require('./world'),
  Minimap: require('./minimap'),
  mixins: require('./mixins')
};


global.pixicam = core;