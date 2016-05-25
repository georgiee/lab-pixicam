/**
* @author       Chris Campbell <iforce2d@gmail.com>
* @author       Richard Davey <rich@photonstorm.com>
* @copyright    2015 Photon Storm Ltd.
* @license      {@link http://choosealicense.com/licenses/no-license/|No License}
*/

/**
* @class Phaser.Physics.Box2D
* @classdesc Physics World Constructor
* @constructor
* @param {Phaser.Game} game - Reference to the current game instance.
*/
Phaser.Physics.Box2D = function (game, config) {
    
    /**
    * @property {Phaser.Game} game - Local reference to game.
    */
    this.game = game;
    
    /**
    * @property {number} ptmRatio - Pixels to Meters ratio.
    * @default 50
    */
    this.ptmRatio = 50;
    
    /**
    * @property {box2d.b2World} world - The Box2D world in which the simulation is run.
    * @protected
    */
    this.world = new box2d.b2World(new box2d.b2Vec2(0, 0));

    /**
    * @property {Phaser.Physics.Box2D.DefaultDebugDraw} - used for rendering debug information
    * @default
    */
    this.debugDraw = new Phaser.Physics.Box2D.DefaultDebugDraw(this.mpx(1));
    this.world.SetDebugDraw(this.debugDraw);

    /**
    * @property {Phaser.Physics.Box2D.DefaultContactListener} - used to check if bodies have contact callbacks set
    * @default
    */
    this.contactListener = new Phaser.Physics.Box2D.DefaultContactListener();
    this.world.SetContactListener(this.contactListener);

    /**
    * @property {number} nextBodyId - The id to give the next created body
    * @protected
    */
    this.nextBodyId = 0;

    /**
    * @property {number} nextFixtureId - The id to give the next created fixture
    * @protected
    */
    this.nextFixtureId = 0;

    /**
    * @property {box2d.b2Vec2} gravity - The gravity of the Box2D world.
    * @protected
    */
    this.gravity = new Phaser.Physics.Box2D.PointProxy(this, this.world, this.world.GetGravity, this.world.SetGravity);

    /**
    * @property {number} friction - The default friction for fixtures created by 'enable', or other functions like setRectangle, setPolygon etc
    * @default
    */
    this.friction = 0.2;

    /**
    * @property {number} restitution - The default restitution for fixtures created by 'enable', or other functions like setRectangle, setPolygon etc
    * @default
    */
    this.restitution = 0.0;

    /**
    * @property {number} density - The default density for fixtures created by 'enable', or other functions like setRectangle, setPolygon etc
    * @default
    */
    this.density = 1.0;

    /**
    * @property {number} frameRate - The frame rate the world will be stepped at. Defaults to 1 / 60, but you can change here. Also see useElapsedTime property.
    * @default
    */
    this.frameRate = 1 / 60;

    /**
    * @property {number} velocityIterations - The maximum number of iterations allowed to adjust velocities to match constraints. Defaults to 8.
    * @default
    */
    this.velocityIterations = 8;

    /**
    * @property {number} positionIterations - The maximum number of iterations allowed to adjust positions to match constraints. Defaults to 3.
    * @default
    */
    this.positionIterations = 3;

    /**
    * @property {boolean} useElapsedTime - If true the frameRate value will be ignored and instead Box2D will step with the value of Game.Time.physicsElapsed, which is a delta time value.
    * @default
    */
    this.useElapsedTime = false;

    /**
    * @property {boolean} paused - The paused state of the Box2D world.
    * @default
    */
    this.paused = false;

    /**
    * @property {box2d.b2ParticleSystem} particleSystem - The World Particle System. Enabled with World.createParticleSystem.
    */
    this.particleSystem = null;

    /**
    * @property {box2d.b2Body} mouseJointBody - A static body with no fixtures, used internally as the 'body A' for mouse joints when dragging dynamic bodies.
    * @default
    */
    var bd = new box2d.b2BodyDef();
    this.mouseJointBody = this.world.CreateBody(bd);

    /**
    * @property {box2d.b2MouseJoint} mouseJoint - The active mouse joint for dragging dynamic bodies.
    * @default
    */
    this.mouseJoint = null;

    //  Pixel to meter function overrides. 
    if (config.hasOwnProperty('mpx') && config.hasOwnProperty('pxm'))
    {
        this.mpx = config.mpx;
        this.pxm = config.pxm;
    }

    /**
    * @property {object} walls - An object containing the 4 wall bodies that bound the physics world.
    */
    this.walls = { left: null, right: null, top: null, bottom: null };

    /**
    * @property {Phaser.Signal} onBodyAdded - Dispatched when a new Body is added to the World.
    */
    this.onBodyAdded = new Phaser.Signal();

    /**
    * @property {Phaser.Signal} onBodyRemoved - Dispatched when a Body is removed from the World.
    */
    this.onBodyRemoved = new Phaser.Signal();

    /**
    * @property {array} _toRemove - Internal var used to hold references to bodies to remove from the world on the next step.
    * @private
    */
    this._toRemove = [];

};

// By default Box2D uses a 16bit value for collision filter category and mask. Most commonly,
// users will use categories starting from 1, 2, 4, 8 etc. The value 0x8000 sets the highest
// bit of a 16bit value and should cause the least interference with this method.
Phaser.Physics.Box2D.worldBoundsFilterCategory = 0x8000;

Phaser.Physics.Box2D.prototype = {

    /**
    * Returns the next id to use to keep body ids unique
    *
    * @method Phaser.Physics.Box2D#getNextBodyId
    * @return {number} The next unique id for a body to be created with.
    */
    getNextBodyId: function () {

        var id = this.nextBodyId;
        this.nextBodyId += 1;
        return id;

    },

    /**
    * Returns the next id to use to keep fixture ids unique
    *
    * @method Phaser.Physics.Box2D#getNextFixtureId
    * @return {number} The next unique id for a fixture to be created with.
    */
    getNextFixtureId: function () {

        var id = this.nextFixtureId;
        this.nextFixtureId += 1;
        return id;

    },

    /**
    * This will add a Box2D physics body into the removal list for the next step.
    *
    * @method Phaser.Physics.Box2D#removeBodyNextStep
    * @param {Phaser.Physics.Box2D.Body} body - The body to remove at the start of the next step.
    */
    removeBodyNextStep: function (body) {

        this._toRemove.push(body);

    },

    /**
    * Called at the start of the core update loop. Purges flagged bodies from the world.
    *
    * @method Phaser.Physics.Box2D#preUpdate
    */
    preUpdate: function () {

        var i = this._toRemove.length;

        while (i--)
        {
            this.removeBody(this._toRemove[i]);
        }

        this._toRemove.length = 0;

    },

    /**
    * This will create a Box2D physics body on the given game object or array of game objects.
    * A game object can only have 1 physics body active at any one time, and it can't be changed until the object is destroyed.
    * Note: When the game object is enabled for Box2D physics it has its anchor x/y set to 0.5 so it becomes centered.
    *
    * @method Phaser.Physics.Box2D#enable
    * @param {object|array|Phaser.Group} object - The game object to create the physics body on. Can also be an array or Group of objects, a body will be created on every child that has a `body` property.
    * @param {boolean} [children=true] - Should a body be created on all children of this object? If true it will recurse down the display list as far as it can go.
    */
    enable: function (object, children) {

        if (typeof children === 'undefined') { children = true; }

        var i = 1;

        if (Array.isArray(object))
        {
            i = object.length;

            while (i--)
            {
                if (object[i] instanceof Phaser.Group)
                {
                    //  If it's a Group then we do it on the children regardless
                    this.enable(object[i].children, children);
                }
                else
                {
                    this.enableBody(object[i]);

                    if (children && object[i].hasOwnProperty('children') && object[i].children.length > 0)
                    {
                        this.enable(object[i], true);
                    }
                }
            }
        }
        else
        {
            if (object instanceof Phaser.Group)
            {
                //  If it's a Group then we do it on the children regardless
                this.enable(object.children, children);
            }
            else
            {
                this.enableBody(object);

                if (children && object.hasOwnProperty('children') && object.children.length > 0)
                {
                    this.enable(object.children, true);
                }
            }
        }

    },

    /**
    * Creates a Box2D physics body on the given game object.
    * A game object can only have 1 physics body active at any one time, and it can't be changed until the body is nulled.
    *
    * @method Phaser.Physics.Box2D#enableBody
    * @param {object} object - The game object to create the physics body on. A body will only be created if this object has a null `body` property.
    */
    enableBody: function (object) {

        if (object.hasOwnProperty('body') && object.body === null)
        {
            object.body = new Phaser.Physics.Box2D.Body(this.game, object, object.x, object.y, 2);
            object.anchor.set(0.5);
        }

    },

    /**
    * Sets the bounds of the Physics world to match the Game.World dimensions.
    * You can optionally set which 'walls' to create: left, right, top or bottom.
    *
    * @method Phaser.Physics#setBoundsToWorld
    * @param {boolean} [left=true] - If true will create the left bounds wall.
    * @param {boolean} [right=true] - If true will create the right bounds wall.
    * @param {boolean} [top=true] - If true will create the top bounds wall.
    * @param {boolean} [bottom=true] - If true will create the bottom bounds wall.
    * @param {number} [collisionCategory=1] - The category (bitmask) to use for the walls.
    * @param {number} [collisionMask=0xFFFFFFFF] - The mask (bitmask) to use for the walls.
    */
    setBoundsToWorld: function (left, right, top, bottom, collisionCategory, collisionMask) {

        if (typeof left === 'undefined') { left = true; }
        if (typeof right === 'undefined') { right = true; }
        if (typeof top === 'undefined') { top = true; }
        if (typeof bottom === 'undefined') { bottom = true; }
        if (typeof collisionCategory === 'undefined') { collisionCategory = 1; }
        if (typeof collisionMask === 'undefined') { collisionCategory = 0xFFFFFFFF; }
        
        this.setBounds(this.game.world.bounds.x, this.game.world.bounds.y, this.game.world.bounds.width, this.game.world.bounds.height, left, right, top, bottom, collisionCategory, collisionMask);

    },

    /**
    * Sets the bounds of the Physics world to match the given world pixel dimensions.
    * You can optionally set which 'walls' to create: left, right, top or bottom.
    *
    * @method Phaser.Physics.Box2D#setBounds
    * @param {number} x - The x coordinate of the top-left corner of the bounds.
    * @param {number} y - The y coordinate of the top-left corner of the bounds.
    * @param {number} width - The width of the bounds.
    * @param {number} height - The height of the bounds.
    * @param {boolean} [left=true] - If true will create the left bounds wall.
    * @param {boolean} [right=true] - If true will create the right bounds wall.
    * @param {boolean} [top=true] - If true will create the top bounds wall.
    * @param {boolean} [bottom=true] - If true will create the bottom bounds wall.
    * @param {number} [collisionCategory=1] - The category (bitmask) to use for the walls.
    * @param {number} [collisionMask=0xFFFFFFFF] - The mask (bitmask) to use for the walls.
    */
    setBounds: function (x, y, width, height, left, right, top, bottom, collisionCategory, collisionMask) {

        if (typeof left === 'undefined') { left = true; }
        if (typeof right === 'undefined') { right = true; }
        if (typeof top === 'undefined') { top = true; }
        if (typeof bottom === 'undefined') { bottom = true; }
        if (typeof collisionCategory === 'undefined') { collisionCategory = 1; }
        if (typeof collisionMask === 'undefined') { collisionMask = 0xFFFFFFFF; }

        if (this.walls.left)
        {
            this.removeBody(this.walls.left);
        }

        if (this.walls.right)
        {
            this.removeBody(this.walls.right);
        }

        if (this.walls.top)
        {
            this.removeBody(this.walls.top);
        }

        if (this.walls.bottom)
        {
            this.removeBody(this.walls.bottom);
        }
        
        // Prepare shape and fixture definitions for use below
        var polygonShape = new box2d.b2PolygonShape();

        var fixtureDef = new box2d.b2FixtureDef();
        fixtureDef.shape = polygonShape;

        fixtureDef.filter.categoryBits = Phaser.Physics.Box2D.worldBoundsFilterCategory;
        fixtureDef.filter.maskBits = 0xFFFF;

        // We could also use edge shapes, but polygons will make sure that if anything
        // should somehow get outside the bounds, it will be brought back (provided it
        // didn't get all the way outside the polygon wall as well of course)
        var boundThickness = this.pxm(100);
        
        var bounds = this.game.world.bounds;

        if (left)
        {
            this.walls.left = this.createBody(0, 0, 0);
            
            polygonShape.SetAsOrientedBox(boundThickness, this.pxm(bounds.height) + boundThickness, new box2d.b2Vec2(boundThickness, 0), 0);
            
            var f = this.walls.left.data.CreateFixture(fixtureDef);
            f.id = this.getNextFixtureId();
        }

        if (right)
        {
            this.walls.right = this.createBody(0, 0, 0);
            
            polygonShape.SetAsOrientedBox(boundThickness, this.pxm(bounds.height) + boundThickness, new box2d.b2Vec2(this.pxm(-bounds.width) - boundThickness, 0), 0);
            
            var f = this.walls.right.data.CreateFixture(fixtureDef);
            f.id = this.getNextFixtureId();
        }

        if (top)
        {
            this.walls.top = this.createBody(0, 0, 0);

            polygonShape.SetAsOrientedBox(this.pxm(bounds.width) + boundThickness, boundThickness, new box2d.b2Vec2(0, boundThickness), 0);
    
            var f = this.walls.top.data.CreateFixture(fixtureDef);
            f.id = this.getNextFixtureId();
        }

        if (bottom)
        {
            this.walls.bottom = this.createBody(0, 0, 0);

            polygonShape.SetAsOrientedBox(this.pxm(bounds.width) + boundThickness, boundThickness, new box2d.b2Vec2(0, this.pxm(-bounds.height) - boundThickness), 0);
    
            var f = this.walls.bottom.data.CreateFixture(fixtureDef);
            f.id = this.getNextFixtureId();
        }

    },

    /**
    * Pauses the Box2D world independent of the game pause state.
    *
    * @method Phaser.Physics.Box2D#pause
    */
    pause: function() {

        this.paused = true;

    },
    
    /**
    * Resumes a paused Box2D world.
    *
    * @method Phaser.Physics.Box2D#resume
    */
    resume: function() {

        this.paused = false;

    },

    /**
    * Internal Box2D update loop.
    *
    * @method Phaser.Physics.Box2D#update
    */
    update: function () {

        // Do nothing when the physics engine was paused before
        if (this.paused)
        {
            return;
        }
        
        if (this.useElapsedTime)
        {
            this.world.Step(this.game.time.physicsElapsed, this.velocityIterations, this.positionIterations);
        }
        else
        {
            this.world.Step(this.frameRate, this.velocityIterations, this.positionIterations);
        }

    },

    /**
    * Clears all bodies from the simulation, resets callbacks.
    *
    * @method Phaser.Physics.Box2D#reset
    */
    reset: function () {

        this.clear();

    },

    /**
    * Clears all bodies from the simulation, resets callbacks.
    *
    * @method Phaser.Physics.Box2D#clear
    */
    clear: function () {

        var gravity = this.world.GetGravity().Clone();

        this.world = new box2d.b2World(gravity);
        this.world.SetDebugDraw(this.debugDraw);
        this.world.SetContactListener(this.contactListener);
        this._toRemove = [];

    },

    /**
    * Clears all bodies from the simulation and unlinks World from Game. Should only be called on game shutdown. Call `clear` on a State change.
    *
    * @method Phaser.Physics.Box2D#destroy
    */
    destroy: function () {

        this.clear();

        this.gravity = null;
        this.world = null;

        this.game = null;

    },

    /**
    * Creates a new Body and adds it to the World.
    *
    * @method Phaser.Physics.Box2D#createBody
    * @param {number} [x=0] - The x coordinate of this Body.
    * @param {number} [y=0] - The y coordinate of this Body.
    * @param {number} [density=2] - The default density of this Body (0 = static, 1 = kinematic, 2 = dynamic, 3 = bullet).
    * @return {Phaser.Physics.P2.Body} The body
    */
    createBody: function (x, y, density) {

        var body = new Phaser.Physics.Box2D.Body(this.game, null, x, y, density, this);

        return body;

    },

    /**
    * Creates a new dynamic Body and adds a Circle fixture to it of the given size.
    *
    * @method Phaser.Physics.Box2D#createCircle
    * @param {number} [x=0] - The x coordinate of this Body.
    * @param {number} [y=0] - The y coordinate of this Body.
    * @param {number} [radius=32] - The radius of this circle in pixels.
    * @param {number} [offsetX=0] - Local horizontal offset of the shape relative to the body center of mass.
    * @param {number} [offsetY=0] - Local vertical offset of the shape relative to the body center of mass.
    * @return {Phaser.Physics.P2.Body} The body
    */
    createCircle: function (x, y, radius, offsetX, offsetY) {
    
        var body = this.createBody(x, y, 2);

        return body.setCircle(radius, offsetX, offsetY);

    },

    /**
    * Creates a new dynamic Body and adds a Rectangle fixture to it of the given dimensions.
    *
    * @method Phaser.Physics.Box2D#createRectangle
    * @param {number} [x=0] - The x coordinate of this Body.
    * @param {number} [y=0] - The y coordinate of this Body.
    * @param {number} [width=16] - The width of the rectangle in pixels.
    * @param {number} [height=16] - The height of the rectangle in pixels.
    * @param {number} [offsetX=0] - Local horizontal offset of the shape relative to the body center of mass.
    * @param {number} [offsetY=0] - Local vertical offset of the shape relative to the body center of mass.
    * @param {number} [rotation=0] - Local rotation of the shape relative to the body center of mass, specified in radians.
    * @return {Phaser.Physics.P2.Body} The body
    */
    createRectangle: function (x, y, width, height, offsetX, offsetY, rotation) {
    
        var body = this.createBody(x, y, 2);

        return body.setRectangle(width, height, offsetX, offsetY, rotation);

    },

    /**
    * Creates a new dynamic Body and adds a Polygon fixture to it.
    *
    * @method Phaser.Physics.Box2D#createPolygon
    * @param {number} [x=0] - The x coordinate of this Body.
    * @param {number} [y=0] - The y coordinate of this Body.
    * @param {Array} vertices - Local positions of the vertices relative to the body center. Format is [x1, y1, x2, y2, ...]
    * @param {number} [firstIndex=0] - The index of the x-value of the starting vertex.
    * @param {number} count - The number of vertices to use. If this parameter is not passed, all vertices above firstIndex will be used.
    * @return {Phaser.Physics.P2.Body} The body
    */
    createPolygon: function (x, y, vertices, firstIndex, count) {
    
        var body = this.createBody(x, y, 2);

        return body.setPolygon(vertices, firstIndex, count);

    },

    /**
    * Adds an already created Box2D Body to this Box2D world.
    *
    * @method Phaser.Physics.Box2D#addBody
    * @param {Phaser.Physics.Box2D.Body} body - The Body to add to the World. Must already exist and not be part of another Box2D world.
    * @return {boolean} True if the Body was added successfully, otherwise false.
    */
    addBody: function (body) {

        if (body.data.world)
        {
            return false;
        }
        else
        {
            body.data = this.world.CreateBody(body.bodyDef);
            body.data.world = this.world;
            body.data.parent = body;

            this.onBodyAdded.dispatch(body);

            return true;
        }

    },

    /**
    * Removes a body from the world. This will silently fail if the body wasn't part of the world to begin with.
    *
    * @method Phaser.Physics.Box2D#removeBody
    * @param {Phaser.Physics.Box2D.Body} body - The Body to remove from the World.
    * @return {Phaser.Physics.Box2D.Body} The Body that was removed.
    */
    removeBody: function (body) {

        if (body.data.world == this.world)
        {
            this.world.DestroyBody(body.data);

            this.onBodyRemoved.dispatch(body);
        }

        return body;

    },

    /**
    * Populates and returns an array with references to of all current Bodies in the world.
    *
    * @method Phaser.Physics.Box2D#getBodies
    * @return {array<Phaser.Physics.Box2D.Body>} An array containing all current Bodies in the world.
    */
    getBodies: function () {

        var output = [];
        
        for (var b = this.world.GetBodyList(); b; b = b.GetNext())
        {
            output.push(b);
        }

        return output;

    },

    /**
    * Checks the given object to see if it has a Box2D body and if so returns it.
    *
    * @method Phaser.Physics.Box2D#getBody
    * @param {object} object - The object to check for a box2d.b2Body on.
    * @return {box2d.b2Body} The Box2D body, or null if not found.
    */
    getBody: function (object) {

        if (object instanceof box2d.b2Body)
        {
            //  Native Box2D body
            return object;
        }
        else if (object instanceof Phaser.Physics.Box2D.Body)
        {
            //  Phaser Box2D Body
            return object.data;
        }
        else if (object['body'] && object['body'].type === Phaser.Physics.BOX2D)
        {
            //  Sprite, TileSprite, etc
            return object.body.data;
        }

        return null;

    },

    /**
    * Converts the current world into a JSON object.
    *
    * @method Phaser.Physics.Box2D#toJSON
    * @return {object} A JSON representation of the world.
    */
    toJSON: function () {

        return this.world.toJSON();

    },

    /**
    * Convert Box2D physics value (meters) to pixel scale.
    * By default we use a scale of 50px per meter.
    * If you need to modify this you can over-ride these functions via the Physics Configuration object.
    *
    * @method Phaser.Physics.Box2D#mpx
    * @param {number} v - The value to convert.
    * @return {number} The scaled value.
    */
    mpx: function (v) {

        return v *= this.ptmRatio;

    },

    /**
    * Convert pixel value to Box2D physics scale (meters).
    * By default we use a scale of 50px per meter.
    * If you need to modify this you can over-ride these functions via the Physics Configuration object.
    *
    * @method Phaser.Physics.Box2D#pxm
    * @param {number} v - The value to convert.
    * @return {number} The scaled value.
    */
    pxm: function (v) {

        return v / this.ptmRatio;

    },
    
    /**
    * Runs the standard 'debug draw' rendering. What actually gets drawn will depend
    * on the current status of the flags set in the debug draw object held by the b2World.
    * This could perhaps be made modifiable at runtime, but for now it is just rendering
    * shapes (see usage of b2Shapes flag below).
    *
    * @method Phaser.Physics.Box2D#renderDebugDraw
    * @param {object} context - The context to render to.
    */
    renderDebugDraw: function(context) {
        
        if (!this.game.physics.box2d) {
            return;
        }
        
        var world = this.game.physics.box2d;
        
        world.debugDraw.start(context);
    
        world.world.DrawDebugData();
        
        world.debugDraw.stop();
    },
    
    /**
    * Renders information about the body as text. This is intended to be used internally by Phaser.Utils.Debug.
    * To make use of this from your code you would call something like game.debug.bodyInfo(sprite, x, y)
    *
    * @method Phaser.Physics.Box2D#renderBodyInfo
    * @param {Phaser.Utils.Debug} debug - The Debug class to use.
    * @param {Phaser.Physics.Box2D} body - The Body to render the info of.
    */
    renderBodyInfo: function (debug, body) {
    
        debug.line('Position: x: ' + body.x.toFixed(3) + ' y: ' + body.y.toFixed(3));
        debug.line('Rotation: ' + body.rotation.toFixed(3) + ' degrees');
        debug.line('Velocity: x: ' + body.velocity.x.toFixed(3) + ' y: ' + body.velocity.y.toFixed(3));
        debug.line('Angular velocity: ' + body.angularVelocity.toFixed(3) + ' degrees/sec');
    
    },

    /**
    * Returns all fixtures found under the given point. Set the onlyOne parameter to true if you only
    * care about finding one fixture under the point.
    *
    * @method Phaser.Physics.Box2D#getFixturesAtPoint
    * @param {Phaser.Pointer} x - The x coordinate of the location to test for (pixel coordinates)
    * @param {Phaser.Pointer} y - The y coordinate of the location to test for (pixel coordinates)
    * @param {boolean} [onlyOne=false] - If true, this function will return after finding just one fixture.
    * @param {boolean} [onlyDynamic=false] - If true, only fixtures on dynamic bodies will be returned.
    * @return {Array} All fixtures found at the given point.
    */
    getFixturesAtPoint: function (x, y, onlyOne, onlyDynamic) {
        
        if (typeof onlyOne === 'undefined') { onlyOne = false; }
        if (typeof onlyDynamic === 'undefined') { onlyDynamic = false; }
        
        var worldx = this.pxm(-x);
        var worldy = this.pxm(-y);
        var worldPoint = new box2d.b2Vec2(worldx, worldy);
        
        // Make a small box.
        var aabb = new box2d.b2AABB();
        var d = new box2d.b2Vec2();

        d.SetXY(0.001, 0.001);

        box2d.b2SubVV(worldPoint, d, aabb.lowerBound);
        box2d.b2AddVV(worldPoint, d, aabb.upperBound);

        var hitFixtures = [];

        // Query the world for overlapping shapes.
        // Here we return true to keep checking, or false to quit.
        var callback = function (fixture)
        {
            if (onlyDynamic && fixture.GetBody().GetType() !== box2d.b2BodyType.b2_dynamicBody)
            {
                return true;
            }
         
            if (fixture.TestPoint(worldPoint))
            {
                hitFixtures.push(fixture);
                return !onlyOne;
            }
         
            return true;
        };

        this.world.QueryAABB(callback, aabb);
        
        return hitFixtures;

    },

    /**
    * Returns all bodies (Phaser.Physics.Box2D.Body) found under the given coordinates. Set the onlyOne
    * parameter to true if you only care about finding one body.
    *
    * @method Phaser.Physics.Box2D#getBodiesAtPoint
    * @param {number} x - The x coordinate of the location to test for (pixel coordinates)
    * @param {number} y - The y coordinate of the location to test for (pixel coordinates)
    * @param {boolean} [onlyOne=false] - If true, this function will return after finding just one body.
    * @param {boolean} [onlyDynamic=false] - If true, only dynamic bodies will be returned.
    * @return {Array} All bodies that have fixtures at the given point.
    */
    getBodiesAtPoint: function (x, y, onlyOne, onlyDynamic) {
        
        if (typeof onlyOne === 'undefined') { onlyOne = false; }
        if (typeof onlyDynamic === 'undefined') { onlyDynamic = false; }
        
        var fixtures = this.getFixturesAtPoint(x, y, onlyOne, onlyDynamic);
        
        if (fixtures.length < 1)
        {
            return fixtures;
        }
        
        var bodies = [];

        for (var i = 0; i < fixtures.length; i++)
        {
            bodies.push(fixtures[i].GetBody().parent);
        }
        
        // http://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array/9229821
        bodies.filter(function(elem, pos) {
            return bodies.indexOf(elem) === pos;
        });
        
        return bodies;

    },    
    
    /**
    * If there is a dynamic body under the given point, a mouse joint will be created
    * to drag that body around. Use the mouseDragMove and mouseDragEnd functions to
    * continue the drag action. Any mouse drag already in progress will be canceled.
    *
    * @method Phaser.Physics.Box2D#mouseDragStart
    * @param {Phaser.Point} point - The location for the drag start (pixel coordinates)
    */
    mouseDragStart: function (point) {
        
        this.mouseDragEnd();
        
        var fixturesAtPoint = this.getFixturesAtPoint(point.x, point.y, true, true);
        
        if ( fixturesAtPoint.length < 1 ) {
            return;
        }
        
        var worldx = this.pxm(-point.x);
        var worldy = this.pxm(-point.y);
        var worldPoint = new box2d.b2Vec2(worldx, worldy);
        
        var jd = new box2d.b2MouseJointDef();
        jd.bodyA = this.mouseJointBody;
        jd.bodyB = fixturesAtPoint[0].GetBody();
        jd.target.Copy(worldPoint);
        jd.maxForce = 1000 * jd.bodyB.GetMass();
        this.mouseJoint = this.world.CreateJoint(jd);
        jd.bodyB.SetAwake(true);
    },
    
    /**
    * Updates the target location of the active mouse joint, if there is one. If there
    * is no mouse joint active, this does nothing.
    *
    * @method Phaser.Physics.Box2D#mouseDragMove
    * @param {Phaser.Point} point - The location for the drag move (pixel coordinates)
    */
    mouseDragMove: function (point) {

        if (!this.mouseJoint)
        {
            return;
        }
        
        var worldx = this.pxm(-point.x);
        var worldy = this.pxm(-point.y);
        var worldPoint = new box2d.b2Vec2(worldx, worldy);
    
        this.mouseJoint.SetTarget(worldPoint);
    
    },
    
    /**
    * Ends the active mouse joint if there is one. If there is no mouse joint active, does nothing.
    *
    * @method Phaser.Physics.Box2D#mouseDragEnd
    */
    mouseDragEnd: function () {

        if (this.mouseJoint)
        {
            this.world.DestroyJoint(this.mouseJoint);
            this.mouseJoint = null;
        }
    
    },
    
    /**
    * Creates a distance joint.
    *
    * @method Phaser.Physics.Box2D#distanceJoint
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyA - first body to be joined
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyB - second body to be joined
    * @param {number} length - target length of joint. If not given, the current position of the anchor points will be used to calculate the joint length.
    * @param {number} [ax=0] - local x position of the anchor in bodyA
    * @param {number} [ay=0] - local y position of the anchor in bodyA
    * @param {number} [bx=0] - local x position of the anchor in bodyB
    * @param {number} [by=0] - local y position of the anchor in bodyB
    * @param {number} [frequency=0] - frequency of joint
    * @param {number} [damping=0] - damping of joint
    * @return {box2d.b2DistanceJoint} The created joint.
    */
    distanceJoint: function (bodyA, bodyB, length, ax, ay, bx, by, frequency, damping) {
        
        if ( typeof ax === 'undefined' ) { ax = 0; }
        if ( typeof ay === 'undefined' ) { ay = 0; }
        if ( typeof bx === 'undefined' ) { bx = 0; }
        if ( typeof by === 'undefined' ) { by = 0; }        
        if ( typeof frequency === 'undefined' ) { frequency = 0; }
        if ( typeof damping === 'undefined' ) { damping = 0; }
        
        ax = this.pxm(-ax);
        ay = this.pxm(-ay);
        bx = this.pxm(-bx);
        by = this.pxm(-by);        
        
        // Could be a sprite
        if (bodyA['body'])
        {
            bodyA = bodyA['body'];
        }

        if (bodyB['body'])
        {
            bodyB = bodyB['body'];
        }
        
        var jd = new box2d.b2DistanceJointDef();

        jd.bodyA = bodyA.data;
        jd.bodyB = bodyB.data;

        jd.localAnchorA.SetXY( ax, ay );
        jd.localAnchorB.SetXY( bx, by );
        
        if (length === null || typeof length === 'undefined')
        {
            // Set length to current
            var worldAnchorA = new box2d.b2Vec2();
            var worldAnchorB = new box2d.b2Vec2();

            jd.bodyA.GetWorldPoint(jd.localAnchorA, worldAnchorA);
            jd.bodyB.GetWorldPoint(jd.localAnchorB, worldAnchorB);

            worldAnchorA.SelfSub(worldAnchorB);
            length = worldAnchorA.Length();
        }
        else
        {
            length = this.pxm(length);
        }
        
        jd.length = length;
        jd.frequencyHz = frequency;
        jd.dampingRatio = damping;
        
        return this.world.CreateJoint(jd);

    },
    
    /**
    * Creates a rope joint.
    *
    * @method Phaser.Physics.Box2D#ropeJoint
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyA - first body to be joined
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyB - second body to be joined
    * @param {number} length - target length of joint. If not given, the current position of the anchor points will be used to calculate the joint length.
    * @param {number} [ax=0] - local x position of the anchor in bodyA
    * @param {number} [ay=0] - local y position of the anchor in bodyA
    * @param {number} [bx=0] - local x position of the anchor in bodyB
    * @param {number} [by=0] - local y position of the anchor in bodyB
    * @return {box2d.b2RopeJoint} The created joint.
    */
    ropeJoint: function (bodyA, bodyB, length, ax, ay, bx, by) {
        
        if ( typeof ax === 'undefined' ) { ax = 0; }
        if ( typeof ay === 'undefined' ) { ay = 0; }
        if ( typeof bx === 'undefined' ) { bx = 0; }
        if ( typeof by === 'undefined' ) { by = 0; }
        
        ax = this.pxm(-ax);
        ay = this.pxm(-ay);
        bx = this.pxm(-bx);
        by = this.pxm(-by);        
        
        // Could be a sprite
        if (bodyA['body'])
        {
            bodyA = bodyA['body'];
        }

        if (bodyB['body'])
        {
            bodyB = bodyB['body'];
        }
        
        var jd = new box2d.b2RopeJointDef();

        jd.bodyA = bodyA.data;
        jd.bodyB = bodyB.data;

        jd.localAnchorA.SetXY( ax, ay );
        jd.localAnchorB.SetXY( bx, by );
        
        if (length === null || typeof length === 'undefined')
        {
            // Set length to current
            var worldAnchorA = new box2d.b2Vec2();
            var worldAnchorB = new box2d.b2Vec2();

            jd.bodyA.GetWorldPoint(jd.localAnchorA, worldAnchorA);
            jd.bodyB.GetWorldPoint(jd.localAnchorB, worldAnchorB);

            worldAnchorA.SelfSub(worldAnchorB);
            length = worldAnchorA.Length();
        }
        else
        {
            length = this.pxm(length);
        }
        
        jd.maxLength = length;
        
        return this.world.CreateJoint(jd);

    },
    
    /**
    * Creates a revolute joint.
    *
    * @method Phaser.Physics.Box2D#revoluteJoint
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyA - first body to be joined
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyB - second body to be joined
    * @param {number} [ax=0] - local x position of the anchor in bodyA
    * @param {number} [ay=0] - local y position of the anchor in bodyA
    * @param {number} [bx=0] - local x position of the anchor in bodyB
    * @param {number} [by=0] - local y position of the anchor in bodyB
    * @param {number} [motorSpeed=0] - target speed (degrees/second), measured as the angle of bodyB relative to bodyA, counter-clockwise being positive
    * @param {number} [motorTorque=0] - maximum torque the joint motor can exert to maintain the target speed
    * @param {boolean} [motorEnabled=false] - Is the motor enabled or not?
    * @param {number} [lowerLimit=0] - the lower limit angle (degrees), measured as the angle of bodyB relative to bodyA
    * @param {number} [upperLimit=0] - the upper limit angle (degrees), measured as the angle of bodyB relative to bodyA
    * @param {boolean} [limitEnabled=false] - Is the limit enabled?
    * @return {box2d.b2RevoluteJoint} The created joint.
    */
    revoluteJoint: function (bodyA, bodyB, ax, ay, bx, by, motorSpeed, motorTorque, motorEnabled, lowerLimit, upperLimit, limitEnabled) {
        
        if ( typeof ax === 'undefined' ) { ax = 0; }
        if ( typeof ay === 'undefined' ) { ay = 0; }
        if ( typeof bx === 'undefined' ) { bx = 0; }
        if ( typeof by === 'undefined' ) { by = 0; }
        if ( typeof motorSpeed === 'undefined' ) { motorSpeed = 0; }
        if ( typeof motorTorque === 'undefined' ) { motorTorque = 0; }
        if ( typeof motorEnabled === 'undefined' ) { motorEnabled = false; }
        if ( typeof lowerLimit === 'undefined' ) { lowerLimit = 0; }
        if ( typeof upperLimit === 'undefined' ) { upperLimit = 0; }
        if ( typeof limitEnabled === 'undefined' ) { limitEnabled = false; }
        
        ax = this.pxm(-ax);
        ay = this.pxm(-ay);
        bx = this.pxm(-bx);
        by = this.pxm(-by);        
        
        // Could be a sprite
        if (bodyA['body'])
        {
            bodyA = bodyA['body'];
        }

        if (bodyB['body'])
        {
            bodyB = bodyB['body'];
        }
        
        var jd = new box2d.b2RevoluteJointDef();

        jd.bodyA = bodyA.data;
        jd.bodyB = bodyB.data;

        jd.localAnchorA.SetXY( ax, ay );
        jd.localAnchorB.SetXY( bx, by );
        
        jd.motorSpeed = Phaser.Math.degToRad(-motorSpeed);
        jd.maxMotorTorque = motorTorque;
        jd.enableMotor = motorEnabled;
        jd.lowerAngle = Phaser.Math.degToRad(lowerLimit);
        jd.upperAngle = Phaser.Math.degToRad(upperLimit);
        jd.enableLimit = limitEnabled;
        
        return this.world.CreateJoint(jd);

    },
    
    /**
    * Creates a prismatic joint.
    *
    * @method Phaser.Physics.Box2D#prismaticJoint
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyA - first body to be joined
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyB - second body to be joined
    * @param {number} [axisX=1] - the x component of the joint axis
    * @param {number} [axisY=0] - the y component of the joint axis
    * @param {number} [ax=0] - local x position of the anchor in bodyA
    * @param {number} [ay=0] - local y position of the anchor in bodyA
    * @param {number} [bx=0] - local x position of the anchor in bodyB
    * @param {number} [by=0] - local y position of the anchor in bodyB
    * @param {number} [motorSpeed=0] - target speed (pixels/second), measured along the joint axis
    * @param {number} [motorForce=0] - maximum torque the joint motor can exert to maintain the target speed
    * @param {boolean} [motorEnabled=false] -Is the motor enabled?
    * @param {number} [lowerLimit=0] - the lower limit angle (pixels), measured along the joint axis
    * @param {number} [upperLimit=0] - the upper limit angle (pixels), measured along the joint axis
    * @param {boolean} [limitEnabled=false] - Is the joint limit enabled?
    * @param {number} [offsetAngle=0] - angle (degrees) relative to bodyA, to which bodyB should be rotated, counter-clockwise being positive
    * @return {box2d.b2PrismaticJoint} The created joint.
    */
    prismaticJoint: function (bodyA, bodyB, axisX, axisY, ax, ay, bx, by, motorSpeed, motorForce, motorEnabled, lowerLimit, upperLimit, limitEnabled, offsetAngle) {
        
        if ( typeof axisX === 'undefined' ) { axisX = 1; }
        if ( typeof axisY === 'undefined' ) { axisY = 0; }
        if ( typeof ax === 'undefined' ) { ax = 0; }
        if ( typeof ay === 'undefined' ) { ay = 0; }
        if ( typeof bx === 'undefined' ) { bx = 0; }
        if ( typeof by === 'undefined' ) { by = 0; }
        if ( typeof motorSpeed === 'undefined' ) { motorSpeed = 0; }
        if ( typeof motorForce === 'undefined' ) { motorForce = 0; }
        if ( typeof lowerLimit === 'undefined' ) { lowerLimit = 0; }
        if ( typeof upperLimit === 'undefined' ) { upperLimit = 0; }
        if ( typeof limitEnabled === 'undefined' ) { limitEnabled = false; }
        if ( typeof motorEnabled === 'undefined' ) { motorEnabled = false; }
        if ( typeof offsetAngle === 'undefined' ) { offsetAngle = 0; }
        
        // Axis is only for direction, so don't need pxm conversion
        axisX *= -1;
        axisY *= -1;
        
        ax = this.pxm(-ax);
        ay = this.pxm(-ay);
        bx = this.pxm(-bx);
        by = this.pxm(-by);
        
        // These are relative to axis, which has been converted already, so only do size change
        motorSpeed = this.pxm(motorSpeed);
        lowerLimit = this.pxm(lowerLimit);
        upperLimit = this.pxm(upperLimit);
        
        // Could be a sprite
        if (bodyA['body'])
        {
            bodyA = bodyA['body'];
        }

        if (bodyB['body'])
        {
            bodyB = bodyB['body'];
        }
        
        var jd = new box2d.b2PrismaticJointDef();

        jd.bodyA = bodyA.data;
        jd.bodyB = bodyB.data;

        jd.localAxisA.SetXY( axisX, axisY );
        jd.localAnchorA.SetXY( ax, ay );
        jd.localAnchorB.SetXY( bx, by );
        
        jd.motorSpeed = motorSpeed;
        jd.maxMotorForce = motorForce;
        jd.enableMotor = motorEnabled;
        jd.lowerTranslation = lowerLimit;
        jd.upperTranslation = upperLimit;
        jd.enableLimit = limitEnabled;
        jd.referenceAngle = Phaser.Math.degToRad(-offsetAngle);
        
        return this.world.CreateJoint(jd);

    },
    
    /**
    * Creates a friction joint.
    *
    * @method Phaser.Physics.Box2D#frictionJoint
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyA - first body to be joined
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyB - second body to be joined
    * @param {number} [ax=0] - local x position of the anchor in bodyA
    * @param {number} [ay=0] - local y position of the anchor in bodyA
    * @param {number} [bx=0] - local x position of the anchor in bodyB
    * @param {number} [by=0] - local y position of the anchor in bodyB
    * @param {number} [maxForce=0] - maximum force the joint can exert to maintain zero linear velocity between the two bodies
    * @param {number} [maxTorque=0] - maximum torque the joint can exert to maintain zero angular velocity between the two bodies
    * @return {box2d.b2FrictionJoint} The created joint.
    */
    frictionJoint: function (bodyA, bodyB, maxForce, maxTorque, ax, ay, bx, by) {
        
        if ( typeof ax === 'undefined' ) { ax = 0; }
        if ( typeof ay === 'undefined' ) { ay = 0; }
        if ( typeof bx === 'undefined' ) { bx = 0; }
        if ( typeof by === 'undefined' ) { by = 0; }
        if ( typeof maxForce === 'undefined' ) { maxForce = 0; }
        if ( typeof maxTorque === 'undefined' ) { maxTorque = 0; }
        
        ax = this.pxm(-ax);
        ay = this.pxm(-ay);
        bx = this.pxm(-bx);
        by = this.pxm(-by);
        
        // Could be a sprite
        if (bodyA['body'])
        {
            bodyA = bodyA['body'];
        }

        if (bodyB['body'])
        {
            bodyB = bodyB['body'];
        }
        
        var jd = new box2d.b2FrictionJointDef();

        jd.bodyA = bodyA.data;
        jd.bodyB = bodyB.data;

        jd.localAnchorA.SetXY( ax, ay );
        jd.localAnchorB.SetXY( bx, by );
        
        jd.maxForce = maxForce;
        jd.maxTorque = maxTorque;
        
        return this.world.CreateJoint(jd);

    },
    
    /**
    * Creates a weld joint.
    *
    * @method Phaser.Physics.Box2D#weldJoint
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyA - first body to be joined
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyB - second body to be joined
    * @param {number} [ax=0] - local x position of the anchor in bodyA
    * @param {number} [ay=0] - local y position of the anchor in bodyA
    * @param {number} [bx=0] - local x position of the anchor in bodyB
    * @param {number} [by=0] - local y position of the anchor in bodyB
    * @param {number} [frequency=0] - frequency of joint
    * @param {number} [damping=0] - damping of joint
    * @return {box2d.b2WeldJoint} The created joint.
    */
    weldJoint: function (bodyA, bodyB, ax, ay, bx, by, frequency, damping) {
        
        if ( typeof ax === 'undefined' ) { ax = 0; }
        if ( typeof ay === 'undefined' ) { ay = 0; }
        if ( typeof bx === 'undefined' ) { bx = 0; }
        if ( typeof by === 'undefined' ) { by = 0; }
        if ( typeof frequency === 'undefined' ) { frequency = 0; }
        if ( typeof damping === 'undefined' ) { damping = 0; }
        
        ax = this.pxm(-ax);
        ay = this.pxm(-ay);
        bx = this.pxm(-bx);
        by = this.pxm(-by);
        
        // Could be a sprite
        if (bodyA['body'])
        {
            bodyA = bodyA['body'];
        }

        if (bodyB['body'])
        {
            bodyB = bodyB['body'];
        }
        
        var jd = new box2d.b2WeldJointDef();

        jd.bodyA = bodyA.data;
        jd.bodyB = bodyB.data;

        jd.localAnchorA.SetXY( ax, ay );
        jd.localAnchorB.SetXY( bx, by );
        
        jd.frequencyHz = frequency;
        jd.dampingRatio = damping;
        
        return this.world.CreateJoint(jd);

    },
    
    /**
    * Creates a motor joint.
    *
    * @method Phaser.Physics.Box2D#motorJoint
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyA - first body to be joined
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyB - second body to be joined
    * @param {number} [offsetX=0] - local x position in bodyA to which bodyB should be moved
    * @param {number} [offsetY=0] - local y position in bodyA to which bodyB should be moved
    * @param {number} [offsetAngle=0] - angle (degrees) relative to bodyA, to which bodyB should be rotated
    * @param {number} [maxForce=0] - maximum force the joint can exert to move bodyB to the offset position
    * @param {number} [maxTorque=0] - maximum torque the joint can exert to rotate bodyB to the offset angle
    * @param {number} [correctionFactor=1] - how quickly the joint should attempt to correct the position of bodyB
    * @return {box2d.b2MotorJoint} The created joint.
    */
    motorJoint: function (bodyA, bodyB, maxForce, maxTorque, correctionFactor, offsetX, offsetY, offsetAngle) {
        
        if ( typeof offsetX === 'undefined' ) { offsetX = 0; }
        if ( typeof offsetY === 'undefined' ) { offsetY = 0; }
        if ( typeof offsetAngle === 'undefined' ) { offsetAngle = 0; }
        if ( typeof maxForce === 'undefined' ) { maxForce = 0; }
        if ( typeof maxTorque === 'undefined' ) { maxTorque = 0; }
        if ( typeof correctionFactor === 'undefined' ) { correctionFactor = 1; }
        
        offsetX = this.pxm(-offsetX);
        offsetY = this.pxm(-offsetY);
        
        // Could be a sprite
        if (bodyA['body'])
        {
            bodyA = bodyA['body'];
        }

        if (bodyB['body'])
        {
            bodyB = bodyB['body'];
        }
        
        var jd = new box2d.b2MotorJointDef();

        jd.bodyA = bodyA.data;
        jd.bodyB = bodyB.data;
        jd.linearOffset.SetXY( offsetX, offsetY );
        
        jd.maxForce = maxForce;
        jd.maxTorque = maxTorque;
        jd.angularOffset = Phaser.Math.degToRad(-offsetAngle);
        jd.correctionFactor = correctionFactor;
        
        return this.world.CreateJoint(jd);

    },
    
    /**
    * Creates a wheel joint.
    *
    * @method Phaser.Physics.Box2D#wheelJoint
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyA - first body to be joined
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyB - second body to be joined
    * @param {number} [ax=0] - local x position of the anchor in bodyA
    * @param {number} [ay=0] - local y position of the anchor in bodyA
    * @param {number} [bx=0] - local x position of the anchor in bodyB
    * @param {number} [by=0] - local y position of the anchor in bodyB
    * @param {number} [axisX=0] - the x component of the joint axis
    * @param {number} [axisY=1] - the y component of the joint axis
    * @param {number} [frequency=0] - frequency of joint
    * @param {number} [damping=0] - damping of joint
    * @param {number} [motorSpeed=0] - target speed (degrees/second), measured as the angle of bodyB relative to bodyA, counter-clockwise being positive.
    * @param {number} [motorTorque=0] - maximum torque the joint motor can exert to maintain the target speed
    * @param {boolean} [motorEnabled=false] - Is the motor enabled?
    * @return {box2d.b2WheelJoint} The created joint.
    */
    wheelJoint: function (bodyA, bodyB, ax, ay, bx, by, axisX, axisY, frequency, damping, motorSpeed, motorTorque, motorEnabled) {
        
        if ( typeof axisX === 'undefined' ) { axisX = 0; }
        if ( typeof axisY === 'undefined' ) { axisY = 1; }
        if ( typeof ax === 'undefined' ) { ax = 0; }
        if ( typeof ay === 'undefined' ) { ay = 0; }
        if ( typeof bx === 'undefined' ) { bx = 0; }
        if ( typeof by === 'undefined' ) { by = 0; }
        if ( typeof motorSpeed === 'undefined' ) { motorSpeed = 0; }
        if ( typeof motorTorque === 'undefined' ) { motorTorque = 0; }
        if ( typeof motorEnabled === 'undefined' ) { motorEnabled = false; }
        if ( typeof frequency === 'undefined' ) { frequency = 0; }
        if ( typeof damping === 'undefined' ) { damping = 0; }
                
        // Axis is only for direction, so don't need pxm conversion
        axisX *= -1;
        axisY *= -1;
        
        ax = this.pxm(-ax);
        ay = this.pxm(-ay);
        bx = this.pxm(-bx);
        by = this.pxm(-by);

        // Could be a sprite
        if (bodyA['body'])
        {
            bodyA = bodyA['body'];
        }

        if (bodyB['body'])
        {
            bodyB = bodyB['body'];
        }
        
        var jd = new box2d.b2WheelJointDef();

        jd.bodyA = bodyA.data;
        jd.bodyB = bodyB.data;

        jd.localAxisA.SetXY( axisX, axisY );
        jd.localAnchorA.SetXY( ax, ay );
        jd.localAnchorB.SetXY( bx, by );
        
        jd.motorSpeed = Phaser.Math.degToRad(-motorSpeed);
        jd.maxMotorTorque = motorTorque;
        jd.enableMotor = motorEnabled;
        jd.frequencyHz = frequency;
        jd.dampingRatio = damping;

        return this.world.CreateJoint(jd);

    },
    
    /**
    * Creates a pulley joint.
    *
    * @method Phaser.Physics.Box2D#pulleyJoint
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyA - first body to be joined
    * @param {Phaser.Physics.Box2D.Body|Phaser.Sprite} bodyB - second body to be joined
    * @param {number} [ax=0] - local x position of the anchor in bodyA
    * @param {number} [ay=0] - local y position of the anchor in bodyA
    * @param {number} [bx=0] - local x position of the anchor in bodyB
    * @param {number} [by=0] - local y position of the anchor in bodyB
    * @param {number} [gax=0] - world x position of the ground anchor of bodyA
    * @param {number} [gay=0] - world y position of the ground anchor of bodyA
    * @param {number} [gbx=0] - world x position of the ground anchor of bodyB
    * @param {number} [gby=0] - world y position of the ground anchor of bodyB
    * @param {number} [ratio=1] - the ratio of movement between the two sides of the pulley
    * @param {number} [lengthA=100] - the length of pulley between bodyA and the ground anchor A
    * @param {number} [lengthB=100] - the length of pulley between bodyB and the ground anchor B
    * @return {box2d.b2PulleyJoint} The created joint.
    */
    pulleyJoint: function (bodyA, bodyB, ax, ay, bx, by, gax, gay, gbx, gby, ratio, lengthA, lengthB) {
        
        if ( typeof ax === 'undefined' ) { ax = 0; }
        if ( typeof ay === 'undefined' ) { ay = 0; }
        if ( typeof bx === 'undefined' ) { bx = 0; }
        if ( typeof by === 'undefined' ) { by = 0; }
        if ( typeof gax === 'undefined' ) { gax = 0; }
        if ( typeof gay === 'undefined' ) { gay = 0; }
        if ( typeof gbx === 'undefined' ) { gbx = 0; }
        if ( typeof gby === 'undefined' ) { gby = 0; }
        if ( typeof ratio === 'undefined' ) { ratio = 1; }
        if ( typeof lengthA === 'undefined' ) { lengthA = 100; }
        if ( typeof lengthB === 'undefined' ) { lengthB = 100; }
        
        ax = this.pxm(-ax);
        ay = this.pxm(-ay);
        bx = this.pxm(-bx);
        by = this.pxm(-by);
        gax = this.pxm(-gax);
        gay = this.pxm(-gay);
        gbx = this.pxm(-gbx);
        gby = this.pxm(-gby);
        lengthA = this.pxm(lengthA);
        lengthB = this.pxm(lengthB);
                
        // Could be a sprite
        if (bodyA['body'])
        {
            bodyA = bodyA['body'];
        }

        if (bodyB['body'])
        {
            bodyB = bodyB['body'];
        }
        
        var jd = new box2d.b2PulleyJointDef();

        jd.bodyA = bodyA.data;
        jd.bodyB = bodyB.data;

        jd.localAnchorA.SetXY( ax, ay );
        jd.localAnchorB.SetXY( bx, by );
        jd.groundAnchorA.SetXY( gax, gay );
        jd.groundAnchorB.SetXY( gbx, gby );
        
        jd.lengthA = lengthA;
        jd.lengthB = lengthB;
        jd.ratio = ratio;
        
        return this.world.CreateJoint(jd);

    },
    
    /**
    * Creates a gear joint.
    *
    * @method Phaser.Physics.Box2D#gearJoint
    * @param {box2d.b2Joint} joint1 - first joint to be gear-joined
    * @param {box2d.b2Joint} joint2 - second joint to be gear-joined
    * @param {number} [ratio=1] - ratio for gearing
    * @return {box2d.b2PulleyJoint} The created joint.
    */
    gearJoint: function (joint1, joint2, ratio) {
        
        if ( typeof ratio === 'undefined' ) { ratio = 1; }
        
        var jd = new box2d.b2GearJointDef();
        jd.joint1 = joint1;
        jd.joint2 = joint2;
        jd.ratio = -ratio;

        jd.bodyA = joint1.GetBodyA();
        jd.bodyB = joint2.GetBodyB();
        
        return this.world.CreateJoint(jd);

    },

    /**
    * Clears all physics bodies from the given TilemapLayer that were created with `World.convertTilemap`.
    *
    * @method Phaser.Physics.Box2D#clearTilemapLayerBodies
    * @param {Phaser.Tilemap} map - The Tilemap to get the map data from.
    * @param {number|string|Phaser.TilemapLayer} [layer] - The layer to operate on. If not given will default to map.currentLayer.
    */
    clearTilemapLayerBodies: function (map, layer) {

        layer = map.getLayer(layer);

        var i = map.layers[layer].bodies.length;

        while (i--)
        {
            map.layers[layer].bodies[i].destroy();
        }

        map.layers[layer].bodies.length = 0;

    },

    /**
    * Goes through all tiles in the given Tilemap and TilemapLayer and converts those set to collide into physics bodies.
    * Only call this *after* you have specified all of the tiles you wish to collide with calls like Tilemap.setCollisionBetween, etc.
    * Every time you call this method it will destroy any previously created bodies and remove them from the world.
    * Therefore understand it's a very expensive operation and not to be done in a core game update loop.
    *
    * @method Phaser.Physics.Box2D#convertTilemap
    * @param {Phaser.Tilemap} map - The Tilemap to get the map data from.
    * @param {number|string|Phaser.TilemapLayer} [layer] - The layer to operate on. If not given will default to map.currentLayer.
    * @param {boolean} [addToWorld=true] - If true it will automatically add each body to the world, otherwise it's up to you to do so.
    * @param {boolean} [optimize=true] - If true adjacent colliding tiles will be combined into a single body to save processing. However it means you cannot perform specific Tile to Body collision responses.
    * @return {array} An array of the Phaser.Physics.Box2D.Body objects that were created.
    */
    convertTilemap: function (map, layer, addToWorld, optimize) {

        layer = map.getLayer(layer);

        if (typeof addToWorld === 'undefined') { addToWorld = true; }
        if (typeof optimize === 'undefined') { optimize = true; }

        //  If the bodies array is already populated we need to nuke it
        this.clearTilemapLayerBodies(map, layer);

        var width = 0;
        var sx = 0;
        var sy = 0;

        for (var y = 0, h = map.layers[layer].height; y < h; y++)
        {
            width = 0;

            for (var x = 0, w = map.layers[layer].width; x < w; x++)
            {
                var tile = map.layers[layer].data[y][x];

                if (tile && tile.index > -1 && tile.collides)
                {
                    if (optimize)
                    {
                        var right = map.getTileRight(layer, x, y);

                        if (width === 0)
                        {
                            sx = tile.x * tile.width;
                            sy = tile.y * tile.height;
                            width = tile.width;
                        }

                        if (right && right.collides)
                        {
                            width += tile.width;
                        }
                        else
                        {
                            var body = new Phaser.Physics.Box2D.Body(this.game, null, sx, sy, 0);

                            body.addRectangle(width, tile.height, width / 2, tile.height / 2, 0);

                            if (addToWorld)
                            {
                                this.addBody(body);
                            }

                            map.layers[layer].bodies.push(body);

                            width = 0;
                        }
                    }
                    else
                    {
                        var body = this.createBody(tile.x * tile.width, tile.y * tile.height, 0, false);

                        body.addRectangle(tile.width, tile.height, tile.width / 2, tile.height / 2, 0);

                        if (addToWorld)
                        {
                            this.addBody(body);
                        }

                        map.layers[layer].bodies.push(body);
                    }
                }
            }
        }

        return map.layers[layer].bodies;

    },
    
    /**
    * Casts a ray and finds intersecting fixtures in the world.
    *
    * @method Phaser.Physics.Box2D#raycast
    * @param {number} x1 - x location of start point (pixels)
    * @param {number} y1 - y location of start point (pixels)
    * @param {number} x2 - x location of end point (pixels)
    * @param {number} y2 - y location of end point (pixels)
    * @param {boolean} [closestHitOnly=true] - set to true if you want only the closest hit
    * @param {function} [filterFunction=null] - a function to be called for each hit, to decide which should be ignored
    * @return {Array} array of hits, as objects with body, fixture, point and normal properties. Eg. [ {body,fixture,point:{x,y},normal:{x,y}}, {body,fixture,point:{x,y},normal:{x,y}} ]
    */
    raycast: function (x1, y1, x2, y2, closestHitOnly, filterFunction) {
        
        if ( typeof closestHitOnly === 'undefined' ) { closestHitOnly = true; }
        if ( typeof filterFunction === 'undefined' ) { filterFunction = null; }
        
        x1 = this.pxm(-x1);
        y1 = this.pxm(-y1);
        x2 = this.pxm(-x2);
        y2 = this.pxm(-y2);

        var point1 = new box2d.b2Vec2(x1, y1);
        var point2 = new box2d.b2Vec2(x2, y2);
        
        var output = [];
                
        var callback = new Phaser.Physics.Box2D.RayCastCallback(this, closestHitOnly, filterFunction);
        this.world.RayCast(callback, point1, point2);
        
        // Need to convert coordinates of hit points to pixels before returning
        for (var i = 0; i < callback.hits.length; i++ )
        {
            var hit = callback.hits[i];
            hit.point = { x: this.mpx(-hit.point.x), y: this.mpx(-hit.point.y) };
            hit.normal = { x: -hit.normal.x, y: -hit.normal.y };
            output.push(hit);
        }
        
        return output;

    },
    
    /**
    * Finds all fixtures with AABBs overlapping the given area. This does NOT mean
    * that the fixtures themselves are actually overlapping the given area.
    *
    * @method Phaser.Physics.Box2D#queryAABB
    * @param {number} x - x location of AABB corner (pixels)
    * @param {number} y - y location of AABB corner (pixels)
    * @param {number} width - AABB width (pixels)
    * @param {number} height - AABB width (pixels)
    * @return {Array} array of hits, as objects with body and fixture properties. Eg. [ {body,fixture}, {body,fixture} ]
    */
    queryAABB: function (x, y, width, height) {
                
        x = this.pxm(-x);
        y = this.pxm(-y);
        width = this.pxm(width);
        height = this.pxm(height);
        
        var aabb = new box2d.b2AABB();
        aabb.lowerBound.SetXY( x - width, y - height );
        aabb.upperBound.SetXY( x, y );
        
        var callback = new Phaser.Physics.Box2D.QueryCallback(this);
        this.world.QueryAABB(callback, aabb);
        
        return callback.hits;

    },
    
    /**
    * Finds all fixtures that overlap the given fixture.
    *
    * @method Phaser.Physics.Box2D#queryFixture
    * @param {box2d.b2Fixture} fixture - the fixture to test overlapping for
    * @return {Array} array of hits, as objects with body and fixture properties. Eg. [ {body,fixture}, {body,fixture} ]
    */
    queryFixture: function (fixture) {
                
        var callback = new Phaser.Physics.Box2D.QueryCallback(this);
        this.world.QueryShape(callback, fixture.GetShape(), fixture.GetBody().GetTransform());
        
        return callback.hits;

    },

    /**
     * If the PTM ratio is changed after creating the world, the debug draw scale needs to be updated.
     *
     * @method Phaser.Physics.Box2D#setPTMRatio
     * @param {number} newRatio - The new ratio to be used for the DebugDraw.
     */
    setPTMRatio: function (newRatio) {
        
        this.ptmRatio = newRatio;
        game.physics.box2d.debugDraw = new Phaser.Physics.Box2D.DefaultDebugDraw(this.ptmRatio);
        game.physics.box2d.world.SetDebugDraw( game.physics.box2d.debugDraw );
        
    }

};

/**
 * Raycast callback, can return either all hits or just the closest, and use a function to filter hits.
 * Intended for internal use by the 'raycast' function
 * @constructor
 * @extends {box2d.b2RayCastCallback}
 * @param {Phaser.Physics.Box2D} world
 * @param {boolean} closestHitOnly
 * @param {function} filterFunction
 */
Phaser.Physics.Box2D.RayCastCallback = function(world, closestHitOnly, filterFunction)
{
    this.world = world;
    this.closestHitOnly = closestHitOnly;
    this.filterFunction = filterFunction;    
    this.hits = [];
};

goog.inherits(Phaser.Physics.Box2D.RayCastCallback, box2d.b2RayCastCallback);

/**
 * Internally used callback function for raycasting. Checks each reported fixture as it is discovered,
 * to see which should be ignored and which should be used.
 * 
 * @param {box2d.b2Fixture} fixture 
 * @param {box2d.b2Vec2} point 
 * @param {box2d.b2Vec2} normal 
 * @param {number} fraction 
 * @return {number} 
 */
Phaser.Physics.Box2D.RayCastCallback.prototype.ReportFixture = function (fixture, point, normal, fraction)
{
    // If a filter function was given, use that to decide if this hit should be ignored
    if (this.filterFunction !== null )
    {
        var pxPoint = { x: this.world.mpx(-point.x), y: this.world.mpx(-point.y) };
        var pxNormal = { x: -normal.x, y: -normal.y };
        var body = fixture.GetBody().parent;

        if (!this.filterFunction.call(this, body, fixture, pxPoint, pxNormal))
        {
            return -1;
        }
    }
    
    // If we are looking for the closest hit, we will have returned 'fraction' from any previously
    // reported hits to clip the ray length, so we know this hit is closer than what we already had.
    if (this.closestHitOnly)
    {
        this.hits = [];
    }
    
    var hit = {};
    hit.body = fixture.GetBody().parent;
    hit.fixture = fixture;
    hit.point = { x: point.x, y: point.y };
    hit.normal = { x: normal.x, y: normal.y };
    this.hits.push(hit);
    
    if (this.closestHitOnly)
    {
        return fraction;
    }
    else
    {
        return 1;
    }

};

/**
 * Query callback, can use a function to filter hits.
 * Intended for internal use by the 'queryAABB' function
 * @constructor
 * @param {Phaser.Physics.Box2D} world
 * @extends {box2d.b2QueryCallback}
 */
Phaser.Physics.Box2D.QueryCallback = function(world)
{
    this.world = world;  
    this.hits = [];
};

goog.inherits(Phaser.Physics.Box2D.QueryCallback, box2d.b2QueryCallback);

/**
 * Internally used callback function for raycasting. Checks each reported fixture as it is discovered,
 * to see which should be ignored and which should be used.
 * 
 * @param {box2d.b2Fixture} fixture
 * @return {number} 
 */
Phaser.Physics.Box2D.QueryCallback.prototype.ReportFixture = function (fixture)
{    
    var hit = {};
    hit.body = fixture.GetBody().parent;
    hit.fixture = fixture;
    this.hits.push(hit);
    
    return true;
};

/**
* Renders the fixtures of the given body.
*
* @method Phaser.Physics.Box2D#renderBody
* @param {object} context - The context to render to.
* @param {Phaser.Physics.Box2D.Body} body - The Body to render.
* @param {string} [color='rgb(255,255,255)'] - color of the debug shape to be rendered. (format is css color string).
* @param {boolean} [filled=true] - Render the shape as a filled (default, true) or a stroked (false)
*/
Phaser.Physics.Box2D.renderBody = function(context, body, color, filled) {

    color = color || 'rgb(255,255,255)';

    if (typeof filled === 'undefined')
    {
        filled = true;
    }
    
    var world = body.game.physics.box2d;
    var b = body.data;    
    var xf = b.GetTransform();
    
    xf.p.x += -body.game.camera.x / world.ptmRatio; // *** added this
    xf.p.y -= -body.game.camera.y / world.ptmRatio; // *** added this
    
    world.debugDraw.start(context);
    
    world.debugDraw.PushTransform(xf);
    
    var rgbcolor = Phaser.Color.webToColor(color);
        
    var b2color = world.debugDraw.color;
    b2color.r = rgbcolor.r / 255;
    b2color.g = rgbcolor.g / 255;
    b2color.b = rgbcolor.b / 255;

    for (var f = b.GetFixtureList(); f; f = f.GetNext())
    {
        world.world.DrawShape(f, b2color);
    }

    world.debugDraw.PopTransform();
    
    world.debugDraw.stop();

};

/**
* @author       Chris Campbell <iforce2d@gmail.com>
* @author       Richard Davey <rich@photonstorm.com>
* @copyright    2015 Photon Storm Ltd.
* @license      {@link http://choosealicense.com/licenses/no-license/|No License}
*/

/**
* The Physics Body is typically linked to a single Sprite and defines properties that determine how the physics body is simulated.
* These properties affect how the body reacts to forces, what forces it generates on itself (to simulate friction), and how it reacts to collisions in the scene.
* In most cases, the properties are used to simulate physical effects. Each body also has its own property values that determine exactly how it reacts to forces and collisions in the scene.
* By default a single Rectangle shape is added to the Body that matches the dimensions of the parent Sprite. See addShape, removeShape, clearFixtures to add extra shapes around the Body.
* Note: When bound to a Sprite to avoid single-pixel jitters on mobile devices we strongly recommend using Sprite sizes that are even on both axis, i.e. 128x128 not 127x127.
* Note: When a game object is given a Box2D body it has its anchor x/y set to 0.5, so it becomes centered.
*
* @class Phaser.Physics.Box2D.Body
* @classdesc Physics Body Constructor
* @constructor
* @param {Phaser.Game} game - Game reference to the currently running game.
* @param {Phaser.Sprite} [sprite] - The Sprite object this physics body belongs to.
* @param {number} [x=0] - The x coordinate of this Body.
* @param {number} [y=0] - The y coordinate of this Body.
* @param {number} [density=2] - The default density of this Body (0 = static, 1 = kinematic, 2 = dynamic, 3 = bullet).
* @param {Phaser.Physics.Box2D} [world] - Reference to the Box2D World.
*/
Phaser.Physics.Box2D.Body = function (game, sprite, x, y, density, world) {

    if (typeof sprite === 'undefined') { sprite = null; }
    if (typeof x === 'undefined') { x = 0; }
    if (typeof y === 'undefined') { y = 0; }
    if (typeof density === 'undefined') { density = 2; }
    if (typeof world === 'undefined') { world = game.physics.box2d; }

    /**
    * @property {Phaser.Game} game - Local reference to game.
    */
    this.game = game;

    /**
    * @property {Phaser.Physics.Box2D} world - Local reference to the Box2D World.
    */
    this.world = world;

    /**
    * @property {number} id - a unique id for this body in the world
    */
    this.id = this.world.getNextBodyId();

    /**
    * @property {Phaser.Sprite} sprite - Reference to the parent Sprite.
    */
    this.sprite = sprite;

    /**
    * @property {number} type - The type of physics system this body belongs to.
    */
    this.type = Phaser.Physics.BOX2D;

    /**
    * @property {Phaser.Point} offset - The offset of the Physics Body from the Sprite x/y position.
    */
    this.offset = new Phaser.Point();

    /**
    * @property {box2d.b2BodyDef} bodyDef - The Box2D body definition
    * @protected
    */
    this.bodyDef = new box2d.b2BodyDef();

    this.bodyDef.position.SetXY(-this.world.pxm(x), -this.world.pxm(y));

    if (density === 0)
    {
        this.bodyDef.type = box2d.b2BodyType.b2_staticBody;
    }
    else if (density === 1)
    {
        this.bodyDef.type = box2d.b2BodyType.b2_kinematicBody;
    }
    else if (density === 2)
    {
        this.bodyDef.type = box2d.b2BodyType.b2_dynamicBody;
    }
    else if (density === 3)
    {
        this.bodyDef.type = box2d.b2BodyType.b2_bulletBody;
    }

    /**
    * @property {box2d.b2Body} data - The Box2D body data.
    * @protected
    */
    this.data = this.world.world.CreateBody(this.bodyDef);
    this.data.world = this.world.world;
    this.data.parent = this;

    /**
    * @property {Phaser.Physics.Box2D.PointProxy} velocity - The velocity of the body. Set velocity.x to a negative value to move to the left, position to the right. velocity.y negative values move up, positive move down.
    */
    this.velocity = new Phaser.Physics.Box2D.PointProxy(this.world, this.data, this.data.GetLinearVelocity, this.data.SetLinearVelocity);

    /**
    * @property {boolean} removeNextStep - To avoid deleting this body during a physics step, and causing all kinds of problems, set removeNextStep to true to have it removed in the next preUpdate.
    */
    this.removeNextStep = false;

    /**
    * @property {object} _fixtureContactCallbacks - Array of contact callbacks, triggered when this body begins or ends contact with a specific fixture.
    * @private
    */
    this._fixtureContactCallbacks = {};

    /**
    * @property {object} _fixtureContactCallbackContext - Array of fixture contact callback contexts.
    * @private
    */
    this._fixtureContactCallbackContext = {};

    /**
    * @property {object} _bodyContactCallbacks - Array of contact callbacks, triggered when this body begins or ends contact with a specific body.
    * @private
    */
    this._bodyContactCallbacks = {};

    /**
    * @property {object} _bodyContactCallbackContext - Array of body contact callback contexts.
    * @private
    */
    this._bodyContactCallbackContext = {};

    /**
    * @property {object} _categoryContactCallbacks - Array of contact callbacks, triggered when this body begins or ends contact with fixtures matching a specific mask.
    * @private
    */
    this._categoryContactCallbacks = {};

    /**
    * @property {object} _categoryContactCallbackContext - Array of category contact callback contexts.
    * @private
    */
    this._categoryContactCallbackContext = {};

    /**
    * @property {object} _fixtureCallbacks - Array of presolve callbacks, triggered while this body continues contact with a specific fixture.
    * @private
    */
    this._fixturePresolveCallbacks = {};

    /**
    * @property {object} _fixtureCallbackContext - Array of fixture presolve callback contexts.
    * @private
    */
    this._fixturePresolveCallbackContext = {};

    /**
    * @property {object} _bodyCallbacks - Array of presolve callbacks, triggered while this body continues contact with a specific body.
    * @private
    */
    this._bodyPresolveCallbacks = {};

    /**
    * @property {object} _bodyCallbackContext - Array of body presolve callback contexts.
    * @private
    */
    this._bodyPresolveCallbackContext = {};

    /**
    * @property {object} _categoryCallbacks - Array of presolve callbacks, triggered while this body continues contact with fixtures matching a specific mask.
    * @private
    */
    this._categoryPresolveCallbacks = {};

    /**
    * @property {object} _categoryCallbackContext - Array of category presolve callback contexts.
    * @private
    */
    this._categoryPresolveCallbackContext = {};

    /**
    * @property {object} _fixturePostsolveCallbacks - Array of postsolve callbacks, triggered while this body continues contact with a specific fixture.
    * @private
    */
    this._fixturePostsolveCallbacks = {};

    /**
    * @property {object} _fixturePostsolveCallbackContext - Array of fixture postsolve callback contexts.
    * @private
    */
    this._fixturePostsolveCallbackContext = {};

    /**
    * @property {object} _bodyPostsolveCallbacks - Array of postsolve callbacks, triggered while this body continues contact with a specific body.
    * @private
    */
    this._bodyPostsolveCallbacks = {};

    /**
    * @property {object} _bodyPostsolveCallbackContext - Array of body postsolve callback contexts.
    * @private
    */
    this._bodyPostsolveCallbackContext = {};

    /**
    * @property {object} _categoryPostsolveCallbacks - Array of postsolve callbacks, triggered while this body continues contact with a specific fixture.
    * @private
    */
    this._categoryPostsolveCallbacks = {};

    /**
    * @property {object} _categoryPostsolveCallbackContext - Array of category postsolve callback contexts.
    * @private
    */
    this._categoryPostsolveCallbackContext = {};
    
    //  Set-up the default shape
    if (sprite)
    {
        this.setRectangleFromSprite(sprite);
    }

};

Phaser.Physics.Box2D.Body.prototype = {

    /**
    * Sets a callback to be fired any time a fixture in this Body begins or ends contact with a fixture in the given Body. 
    * The callback will be sent 6 parameters:
    *     this body
    *     the body that was contacted
    *     the fixture in this body (box2d.b2Fixture)
    *     the fixture in the other body that was contacted (box2d.b2Fixture)
    *     a boolean to say whether it was a begin or end event
    *     the contact object itself (box2d.b2Contact)
    * Note that the impact event happens after collision resolution, so it cannot be used to prevent a collision from happening.
    *
    * @method Phaser.Physics.Box2D.Body#setBodyContactCallback
    * @param {Phaser.Sprite|Phaser.Physics.Box2D.Body} object - The object to do callbacks for.
    * @param {function} callback - The callback to fire on contact. Set to null to clear a previously set callback.
    * @param {object} callbackContext - The context under which the callback will fire.
    */
    setBodyContactCallback: function (object, callback, callbackContext) {

        var id = -1;

        if (object['id'])
        {
            id = object.id;
        }
        else if (object['body'])
        {
            id = object.body.id;
        }

        if (id > -1)
        {
            if (callback === null)
            {
                delete (this._bodyContactCallbacks[id]);
                delete (this._bodyContactCallbackContext[id]);
            }
            else
            {
                this._bodyContactCallbacks[id] = callback;
                this._bodyContactCallbackContext[id] = callbackContext;
            }
        }

    },

    /**
    * Sets a callback to be fired any time the given fixture begins or ends contact something
    * The callback will be sent 6 parameters:
    *     this body
    *     the body that was contacted
    *     the fixture in this body (box2d.b2Fixture)
    *     the fixture in the other body that was contacted (box2d.b2Fixture)
    *     a boolean to say whether it was a begin or end event
    *     the contact object itself (box2d.b2Contact)
    * Note that the impact event happens after collision resolution, so it cannot be used to prevent a collision from happening.
    *
    * @method Phaser.Physics.Box2D.Body#setFixtureContactCallback
    * @param {box2d.b2Fixture} fixture - The fixture to do callbacks for.
    * @param {function} callback - The callback to fire on contact. Set to null to clear a previously set callback.
    * @param {object} callbackContext - The context under which the callback will fire.
    */
    setFixtureContactCallback: function (fixture, callback, callbackContext) {

        var id = fixture.id;

        if (id > -1)
        {
            if (callback === null)
            {
                delete (this._fixtureContactCallbacks[id]);
                delete (this._fixtureContactCallbackContext[id]);
            }
            else
            {
                this._fixtureContactCallbacks[id] = callback;
                this._fixtureContactCallbackContext[id] = callbackContext;
            }
        }

    },

    /**
    * Sets a callback to be fired any time a fixture in this body begins contact with a fixture in another body that matches given category set.
    * The callback will be sent 6 parameters:
    *     this body
    *     the body that was contacted
    *     the fixture in this body (box2d.b2Fixture)
    *     the fixture in the other body that was contacted (box2d.b2Fixture)
    *     a boolean to say whether it was a begin or end event
    *     the contact object itself (box2d.b2Contact)
    * Note that the impact event happens after collision resolution, so it cannot be used to prevent a collision from happening.
    *
    * @method Phaser.Physics.Box2D.Body#setCategoryContactCallback
    * @param {number} category - A bitmask specifying the category(s) to trigger for.
    * @param {function} callback - The callback to fire on contact. Set to null to clear a previously set callback.
    * @param {object} callbackContext - The context under which the callback will fire.
    */
    setCategoryContactCallback: function (category, callback, callbackContext) {

        if (callback === null)
        {
            delete (this._categoryContactCallbacks[category]);
            delete (this._categoryContactCallbacksContext[category]);
        }
        else
        {
            this._categoryContactCallbacks[category] = callback;
            this._categoryContactCallbackContext[category] = callbackContext;
        }

    },
    
    /**
    * Sets a callback to be fired when PreSolve is done for contacts between a fixture in this body and a fixture in the given Body.
    * The callback will be sent 6 parameters:
    *     this body
    *     the body that was contacted
    *     the fixture in this body (box2d.b2Fixture)
    *     the fixture in the other body that was contacted (box2d.b2Fixture)
    *     a boolean to say whether it was a begin or end event
    *     the contact object itself (box2d.b2Contact)
    * Note that the impact event happens after collision resolution, so it cannot be used to prevent a collision from happening.
    *
    * @method Phaser.Physics.Box2D.Body#setBodyPresolveCallback
    * @param {Phaser.Sprite|Phaser.Physics.Box2D.Body} object - The object to do callbacks for.
    * @param {function} callback - The callback to fire on contact. Set to null to clear a previously set callback.
    * @param {object} callbackContext - The context under which the callback will fire.
    */
    setBodyPresolveCallback: function (object, callback, callbackContext) {

        var id = -1;

        if (object['id'])
        {
            id = object.id;
        }
        else if (object['body'])
        {
            id = object.body.id;
        }

        if (id > -1)
        {
            if (callback === null)
            {
                delete (this._bodyPresolveCallbacks[id]);
                delete (this._bodyPresolveCallbackContext[id]);
            }
            else
            {
                this._bodyPresolveCallbacks[id] = callback;
                this._bodyPresolveCallbackContext[id] = callbackContext;
            }
        }

    },

    /**
    * Sets a callback to be fired when PreSolve is done for contacts between a fixture in this body the given fixture.
    * The callback will be sent 6 parameters:
    *     this body
    *     the body that was contacted
    *     the fixture in this body (box2d.b2Fixture)
    *     the fixture in the other body that was contacted (box2d.b2Fixture)
    *     a boolean to say whether it was a begin or end event
    *     the contact object itself (box2d.b2Contact)
    * Note that the impact event happens after collision resolution, so it cannot be used to prevent a collision from happening.
    *
    * @method Phaser.Physics.Box2D.Body#setFixturePresolveCallback
    * @param {box2d.b2Fixture} fixture - The fixture to do callbacks for.
    * @param {function} callback - The callback to fire on contact. Set to null to clear a previously set callback.
    * @param {object} callbackContext - The context under which the callback will fire.
    */
    setFixturePresolveCallback: function (fixture, callback, callbackContext) {

        var id = fixture.id;

        if (id > -1)
        {
            if (callback === null)
            {
                delete (this._fixturePresolveCallbacks[id]);
                delete (this._fixturePresolveCallbackContext[id]);
            }
            else
            {
                this._fixturePresolveCallbacks[id] = callback;
                this._fixturePresolveCallbackContext[id] = callbackContext;
            }
        }

    },

    /**
    * Sets a callback to be fired when PreSolve is done for contacts between a fixture in this body and a fixture in another body that matches given category set.
    * The callback will be sent 6 parameters:
    *     this body
    *     the body that was contacted
    *     the fixture in this body (box2d.b2Fixture)
    *     the fixture in the other body that was contacted (box2d.b2Fixture)
    *     a boolean to say whether it was a begin or end event
    *     the contact object itself (box2d.b2Contact)
    * Note that the impact event happens after collision resolution, so it cannot be used to prevent a collision from happening.
    *
    * @method Phaser.Physics.Box2D.Body#setCategoryPresolveCallback
    * @param {number} category - A bitmask specifying the category(s) to trigger for.
    * @param {function} callback - The callback to fire on contact. Set to null to clear a previously set callback.
    * @param {object} callbackContext - The context under which the callback will fire.
    */
    setCategoryPresolveCallback: function (category, callback, callbackContext) {

        if (callback === null)
        {
            delete (this._categoryPresolveCallbacks[category]);
            delete (this._categoryPresolveCallbacksContext[category]);
        }
        else
        {
            this._categoryPresolveCallbacks[category] = callback;
            this._categoryPresolveCallbackContext[category] = callbackContext;
        }

    },
    
    /**
    * Sets a callback to be fired when PostSolve is done for contacts between a fixture in this body and a fixture in the given Body.
    * The callback will be sent 6 parameters:
    *     this body
    *     the body that was contacted
    *     the fixture in this body (box2d.b2Fixture)
    *     the fixture in the other body that was contacted (box2d.b2Fixture)
    *     a boolean to say whether it was a begin or end event
    *     the contact object itself (box2d.b2Contact)
    * Note that the impact event happens after collision resolution, so it cannot be used to prevent a collision from happening.
    *
    * @method Phaser.Physics.Box2D.Body#setBodyPostsolveCallback
    * @param {Phaser.Sprite|Phaser.Physics.Box2D.Body} object - The object to do callbacks for.
    * @param {function} callback - The callback to fire on contact. Set to null to clear a previously set callback.
    * @param {object} callbackContext - The context under which the callback will fire.
    */
    setBodyPostsolveCallback: function (object, callback, callbackContext) {

        var id = -1;

        if (object['id'])
        {
            id = object.id;
        }
        else if (object['body'])
        {
            id = object.body.id;
        }

        if (id > -1)
        {
            if (callback === null)
            {
                delete (this._bodyPostsolveCallbacks[id]);
                delete (this._bodyPostsolveCallbackContext[id]);
            }
            else
            {
                this._bodyPostsolveCallbacks[id] = callback;
                this._bodyPostsolveCallbackContext[id] = callbackContext;
            }
        }

    },

    /**
    * Sets a callback to be fired when PostSolve is done for contacts between a fixture in this body the given fixture.
    * The callback will be sent 6 parameters:
    *     this body
    *     the body that was contacted
    *     the fixture in this body (box2d.b2Fixture)
    *     the fixture in the other body that was contacted (box2d.b2Fixture)
    *     a boolean to say whether it was a begin or end event
    *     the contact object itself (box2d.b2Contact)
    * Note that the impact event happens after collision resolution, so it cannot be used to prevent a collision from happening.
    *
    * @method Phaser.Physics.Box2D.Body#setFixturePostsolveCallback
    * @param {box2d.b2Fixture} fixture - The fixture to do callbacks for.
    * @param {function} callback - The callback to fire on contact. Set to null to clear a previously set callback.
    * @param {object} callbackContext - The context under which the callback will fire.
    */
    setFixturePostsolveCallback: function (fixture, callback, callbackContext) {

        var id = fixture.id;

        if (id > -1)
        {
            if (callback === null)
            {
                delete (this._fixturePostsolveCallbacks[id]);
                delete (this._fixturePostsolveCallbackContext[id]);
            }
            else
            {
                this._fixturePostsolveCallbacks[id] = callback;
                this._fixturePostsolveCallbackContext[id] = callbackContext;
            }
        }

    },

    /**
    * Sets a callback to be fired when PostSolve is done for contacts between a fixture in this body and a fixture in another body that matches given category set.
    * The callback will be sent 6 parameters:
    *     this body
    *     the body that was contacted
    *     the fixture in this body (box2d.b2Fixture)
    *     the fixture in the other body that was contacted (box2d.b2Fixture)
    *     a boolean to say whether it was a begin or end event
    *     the contact object itself (box2d.b2Contact)
    * Note that the impact event happens after collision resolution, so it cannot be used to prevent a collision from happening.
    *
    * @method Phaser.Physics.Box2D.Body#setCategoryPostsolveCallback
    * @param {number} category - A bitmask specifying the category(s) to trigger for.
    * @param {function} callback - The callback to fire on contact. Set to null to clear a previously set callback.
    * @param {object} callbackContext - The context under which the callback will fire.
    */
    setCategoryPostsolveCallback: function (category, callback, callbackContext) {

        if (callback === null)
        {
            delete (this._categoryPostsolveCallbacks[category]);
            delete (this._categoryPostsolveCallbacksContext[category]);
        }
        else
        {
            this._categoryPostsolveCallbacks[category] = callback;
            this._categoryPostsolveCallbackContext[category] = callbackContext;
        }

    },

    /**
    * Sets the given collision category for all fixtures in this Body, unless a specific fixture is given.
    *
    * @method Phaser.Physics.Box2D.Body#setCollisionCategory
    * @param {number} category - A bitmask representing the category(s) to include
    * @param {box2d.b2Fixture} [fixture] - An optional fixture. If not provided the collision category will be added to all fixtures in this body.
    */
    setCollisionCategory: function (category, fixture) {

        if (typeof shape === 'undefined')
        {
            for (var f = this.data.GetFixtureList(); f; f = f.GetNext())
            {
                var filter = f.GetFilterData();
                filter.categoryBits = category;
            }
        }
        else
        {
            var filter = fixture.GetFilterData();
            filter.categoryBits = category;
        }

    },

    /**
    * Sets the given collision mask for all fixtures in this Body, unless a specific fixture is given.
    *
    * @method Phaser.Physics.Box2D.Body#setCollisionMask
    * @param {number} mask - A bitmask representing the category(s) to include
    * @param {box2d.b2Fixture} [fixture] - An optional fixture. If not provided the collision mask will be added to all fixtures in this body.
    */
    setCollisionMask: function (mask, fixture) {

        if (typeof shape === 'undefined')
        {
            for (var f = this.data.GetFixtureList(); f; f = f.GetNext())
            {
                var filter = f.GetFilterData();
                filter.maskBits = mask;
            }
        }
        else
        {
            var filter = fixture.GetFilterData();
            filter.maskBits = mask;
        }

    },

    /**
    * Apply force at the center of mass. This will not cause any rotation.
    *
    * @method Phaser.Physics.Box2D.Body#applyForce
    * @param {number} x - 
    * @param {number} y - 
    */
    applyForce: function (x, y) {

        this.data.ApplyForce(new box2d.b2Vec2(-x,-y), this.data.GetWorldCenter(), true);

    },

    /**
    * If this Body is dynamic then this will zero its angular velocity.
    *
    * @method Phaser.Physics.Box2D.Body#setZeroRotation
    */
    setZeroRotation: function () {

        this.data.SetAngularVelocity(0);

    },

    /**
    * If this Body is dynamic then this will zero its velocity on both axis.
    *
    * @method Phaser.Physics.Box2D.Body#setZeroVelocity
    */
    setZeroVelocity: function () {

        this.data.SetLinearVelocity(box2d.b2Vec2.ZERO);

    },

    /**
    * Sets the linear damping and angular damping to zero.
    *
    * @method Phaser.Physics.Box2D.Body#setZeroDamping
    */
    setZeroDamping: function () {

        this.data.SetLinearDamping(0);
        this.data.SetAngularDamping(0);

    },

    /**
    * Transform a world point to local body frame.
    *
    * @method Phaser.Physics.Box2D.Body#toLocalPoint
    * @param {box2d.b2Vec2} out - The point to store the result in.
    * @param {box2d.b2Vec2} worldPoint - The input world point.
    */
    toLocalPoint: function (out, worldPoint) {
    
        out.x = this.world.pxm(-worldPoint.x);
        out.y = this.world.pxm(-worldPoint.y);
        this.data.GetLocalPoint(out, out);        
        out.x = this.world.mpx(-out.x);
        out.y = this.world.mpx(-out.y);
        
        return out;

    },

    /**
    * Transform a local point to world frame.
    *
    * @method Phaser.Physics.Box2D.Body#toWorldPoint
    * @param {box2d.b2Vec2} out - The point to store the result in.
    * @param {box2d.b2Vec2} localPoint - The input local point.
    */
    toWorldPoint: function (out, localPoint) {

        out.x = this.world.pxm(-localPoint.x);
        out.y = this.world.pxm(-localPoint.y);
        this.data.GetWorldPoint(out, out);        
        out.x = this.world.mpx(-out.x);
        out.y = this.world.mpx(-out.y);

        return out;
    },

    /**
    * Transform a world vector to local body frame.
    *
    * @method Phaser.Physics.Box2D.Body#toLocalVector
    * @param {box2d.b2Vec2} out - The vector to store the result in.
    * @param {box2d.b2Vec2} worldVector - The input world vector.
    */
    toLocalVector: function (out, worldVector) {

        out.x = this.world.pxm(-worldVector.x);
        out.y = this.world.pxm(-worldVector.y);
        this.data.GetLocalVector(out, out);        
        out.x = this.world.mpx(-out.x);
        out.y = this.world.mpx(-out.y);
        
        return out;

    },

    /**
    * Transform a local vector to world frame.
    *
    * @method Phaser.Physics.Box2D.Body#toWorldVector
    * @param {box2d.b2Vec2} out - The vector to store the result in.
    * @param {box2d.b2Vec2} localVector - The input local vector.
    */
    toWorldVector: function (out, localVector) {

        out.x = this.world.pxm(-localVector.x);
        out.y = this.world.pxm(-localVector.y);
        this.data.GetWorldVector(out, out);        
        out.x = this.world.mpx(-out.x);
        out.y = this.world.mpx(-out.y);

    },

    /**
    * This will rotate the Body by the given speed to the left (counter-clockwise).
    *
    * @method Phaser.Physics.Box2D.Body#rotateLeft
    * @param {number} speed - The speed at which it should rotate.
    */
    rotateLeft: function (speed) {

        this.data.SetAngularVelocity(this.world.pxm(-speed));

    },

    /**
    * This will rotate the Body by the given speed to the left (clockwise).
    *
    * @method Phaser.Physics.Box2D.Body#rotateRight
    * @param {number} speed - The speed at which it should rotate.
    */
    rotateRight: function (speed) {

        this.data.SetAngularVelocity(this.world.pxm(speed));

    },

    /**
    * Moves the Body forwards based on its current angle and the given speed.
    * The speed is represented in pixels per second. So a value of 100 would move 100 pixels in 1 second.
    *
    * @method Phaser.Physics.Box2D.Body#moveForward
    * @param {number} speed - The speed at which body should move forwards.
    */
    moveForward: function (speed) {

        var magnitude = this.world.pxm(speed);
        var direction = new box2d.b2Vec2();
        this.toWorldVector(direction, {x:0,y:magnitude});
        this.data.SetLinearVelocity(direction);
        
    },

    /**
    * Moves the Body backwards based on its current angle and the given speed.
    * The speed is represented in pixels per second. So a value of 100 would move 100 pixels in 1 second.
    *
    * @method Phaser.Physics.Box2D.Body#moveBackward
    * @param {number} speed - The speed at which body should move backwards.
    */
    moveBackward: function (speed) {

        var magnitude = this.world.pxm(-speed);
        var direction = new box2d.b2Vec2();
        this.toWorldVector(direction, {x:0,y:magnitude});
        this.data.SetLinearVelocity(direction);

    },

    /**
    * Applies a force to the Body that causes it to 'thrust' forwards, based on its current angle and the given speed.
    *
    * @method Phaser.Physics.Box2D.Body#thrust
    * @param {number} power - The magnitude of the thrust force.
    */
    thrust: function (power) {
    
        // Magnitude should be multiplied by the mass of the body, so that user  
        // will see the same results regardless of the size of the sprite.
        var magnitude = this.world.pxm(power) * this.data.GetMass();
        
        var force = new box2d.b2Vec2();
        this.toWorldVector(force, {x:0,y:magnitude});
        
        this.data.ApplyForce( force, this.data.GetWorldCenter(), true );

    },

    /**
    * Applies a force to the Body that causes it to 'thrust' backwards (in reverse), based on its current angle and the given speed.
    *
    * @method Phaser.Physics.Box2D.Body#reverse
    * @param {number} power - The magnitude of the thrust force.
    */
    reverse: function (power) {
    
        // Magnitude should be multiplied by the mass of the body, so that user  
        // will see the same results regardless of the size of the sprite.
        var magnitude = -this.world.pxm(power) * this.data.GetMass();
        
        var force = new box2d.b2Vec2();
        this.toWorldVector(force, {x:0,y:magnitude});
        
        this.data.ApplyForce( force, this.data.GetWorldCenter(), true );

    },

    /**
    * If this Body is dynamic then this will move it to the left by setting its x velocity to the given speed.
    * The speed is represented in pixels per second. So a value of 100 would move 100 pixels in 1 second.
    *
    * @method Phaser.Physics.Box2D.Body#moveLeft
    * @param {number} speed - The speed at which it should move to the left, in pixels per second.
    */
    moveLeft: function (speed) {

        this.velocity.x = -speed;

    },

    /**
    * If this Body is dynamic then this will move it to the right by setting its x velocity to the given speed.
    * The speed is represented in pixels per second. So a value of 100 would move 100 pixels in 1 second.
    *
    * @method Phaser.Physics.Box2D.Body#moveRight
    * @param {number} speed - The speed at which it should move to the right, in pixels per second.
    */
    moveRight: function (speed) {

        this.velocity.x = speed;

    },

    /**
    * If this Body is dynamic then this will move it up by setting its y velocity to the given speed.
    * The speed is represented in pixels per second. So a value of 100 would move 100 pixels in 1 second.
    *
    * @method Phaser.Physics.Box2D.Body#moveUp
    * @param {number} speed - The speed at which it should move up, in pixels per second.
    */
    moveUp: function (speed) {

        this.velocity.y = -speed;

    },

    /**
    * If this Body is dynamic then this will move it down by setting its y velocity to the given speed.
    * The speed is represented in pixels per second. So a value of 100 would move 100 pixels in 1 second.
    *
    * @method Phaser.Physics.Box2D.Body#moveDown
    * @param {number} speed - The speed at which it should move down, in pixels per second.
    */
    moveDown: function (speed) {

        this.velocity.y = speed;

    },

    /**
    * Internal method. This is called directly before the sprites are sent to the renderer and after the update function has finished.
    *
    * @method Phaser.Physics.Box2D.Body#preUpdate
    * @protected
    */
    preUpdate: function () {

        if (this.removeNextStep)
        {
            this.removeFromWorld();
            this.removeNextStep = false;
        }

    },

    /**
    * Internal method. This is called directly before the sprites are sent to the renderer and after the update function has finished.
    *
    * @method Phaser.Physics.Box2D.Body#postUpdate
    * @protected
    */
    postUpdate: function () {

        if (this.sprite)
        {
            this.sprite.x = this.world.mpx(-this.data.GetPosition().x);
            this.sprite.y = this.world.mpx(-this.data.GetPosition().y);
            this.sprite.rotation = this.data.GetAngle();
        }

    },

    /**
    * Sets this body as inactive. It will not participate in collisions or
    * any other aspect of the physics simulation. Intended for use by Phaser.Sprite.kill()
    *
    * @method Phaser.Physics.Box2D.Body#kill
    */
    kill: function () {

        this.data.SetActive(false);

    },

    /**
    * Restores the active status of this body.
    *
    * @method Phaser.Physics.Box2D.Body#reset
    * @param {number} x - The new x position of the Body.
    * @param {number} y - The new x position of the Body.
    */
    reset: function (x, y) {

        this.data.SetPositionXY( this.world.pxm(-x), this.world.pxm(-y) );
        this.data.SetActive(true);

    },

    /**
    * Removes this physics body from the world.
    *
    * @method Phaser.Physics.Box2D.Body#removeFromWorld
    */
    removeFromWorld: function () {

        if (this.data.world === this.game.physics.box2d.world)
        {
            this.game.physics.box2d.removeBodyNextStep(this);
        }

    },

    /**
    * Destroys this Body and all references it holds to other objects.
    *
    * @method Phaser.Physics.Box2D.Body#destroy
    */
    destroy: function () {

        this.removeFromWorld();

        this._bodyCallbacks = {};
        this._bodyCallbackContext = {};
        this._categoryCallbacks = {};
        this._categoryCallbackContext = {};

        this.sprite = null;

    },

    /**
    * Removes all fixtures from this Body.
    *
    * @method Phaser.Physics.Box2D.Body#clearFixtures
    */
    clearFixtures: function () {

        var fixtures = [];
        for (var f = this.data.GetFixtureList(); f; f = f.GetNext()) {
            fixtures.push(f);
        }

        var i = fixtures.length;

        while (i--)
        {
            this.data.DestroyFixture(fixtures[i]);
        }

    },

    /**
    * Adds a Circle fixture to this Body. You can control the offset from the center of the body and the rotation.
    * It will use the World friction, restitution and density by default.
    *
    * @method Phaser.Physics.Box2D.Body#addCircle
    * @param {number} radius - The radius of this circle (in pixels)
    * @param {number} [offsetX=0] - Local horizontal offset of the shape relative to the body center of mass.
    * @param {number} [offsetY=0] - Local vertical offset of the shape relative to the body center of mass.
    * @return {box2d.b2Fixture} The fixture that was added to the Body.
    */
    addCircle: function (radius, offsetX, offsetY) {

        var circleShape = new box2d.b2CircleShape(this.world.pxm(radius));
        circleShape.m_p.SetXY(this.world.pxm(-offsetX), this.world.pxm(-offsetY));

        var fixtureDef = new box2d.b2FixtureDef();
        fixtureDef.shape = circleShape;
        fixtureDef.friction = this.world.friction;
        fixtureDef.restitution = this.world.restitution;
        fixtureDef.density = this.world.density;

        var f = this.data.CreateFixture(fixtureDef);
        f.id = this.world.getNextFixtureId();

        return f;

    },

    /**
    * Adds a Rectangle fixture to this Body. You can control the offset from the center of the body and the rotation.
    * It will use the World friction, restitution and density by default.
    *
    * @method Phaser.Physics.Box2D.Body#addRectangle
    * @param {number} [width=16] - The width of the rectangle in pixels.
    * @param {number} [height=16] - The height of the rectangle in pixels.
    * @param {number} [offsetX=0] - Local horizontal offset (pixels) of the shape relative to the body center.
    * @param {number} [offsetY=0] - Local vertical offset (pixels) of the shape relative to the body center.
    * @param {number} [rotation=0] - Local rotation of the shape relative to the body center of mass, specified in radians.
    * @return {box2d.b2Fixture} The fixture that was added to the Body.
    */
    addRectangle: function (width, height, offsetX, offsetY, rotation) {

        if (typeof width === 'undefined') { width = 16; }
        if (typeof height === 'undefined') { height = 16; }
        if (typeof offsetX === 'undefined') { offsetX = 0; }
        if (typeof offsetY === 'undefined') { offsetY = 0; }
        if (typeof rotation === 'undefined') { rotation = 0; }   
    
        width = this.world.pxm(width);
        height = this.world.pxm(height);

        var polygonShape = new box2d.b2PolygonShape();
        polygonShape.SetAsOrientedBox(0.5 * width, 0.5 * height, new box2d.b2Vec2(this.world.pxm(-offsetX), this.world.pxm(-offsetY)), rotation);

        var fixtureDef = new box2d.b2FixtureDef();
        fixtureDef.shape = polygonShape;
        fixtureDef.friction = this.world.friction;
        fixtureDef.restitution = this.world.restitution;
        fixtureDef.density = this.world.density;

        var f = this.data.CreateFixture(fixtureDef);
        f.id = this.world.getNextFixtureId();

        return f;

    },

    /**
    * Creates a new Edge Shape and adds it to this Body.
    * It will use the World friction, restitution and density by default.
    *
    * @method Phaser.Physics.Box2D.Body#addEdge
    * @param {number} [x1=0] - Local horizontal offset of the first point relative to the body center.
    * @param {number} [y1=0] - Local vertical offset of the first point relative to the body center.
    * @param {number} [x2=0] - Local horizontal offset of the second point relative to the body center.
    * @param {number} [y2=0] - Local vertical offset of the second point relative to the body center.
    * @return {box2d.b2Fixture} The fixture that was added to the Body.
    */
    addEdge: function (x1, y1, x2, y2) {

        var edgeShape = new box2d.b2EdgeShape();
        edgeShape.Set( new box2d.b2Vec2(this.world.pxm(-x1), this.world.pxm(-y1)), new box2d.b2Vec2(this.world.pxm(-x2), this.world.pxm(-y2)) );

        var fixtureDef = new box2d.b2FixtureDef();
        fixtureDef.shape = edgeShape;
        fixtureDef.friction = this.world.friction;
        fixtureDef.restitution = this.world.restitution;
        fixtureDef.density = this.world.density;

        var f = this.data.CreateFixture(fixtureDef);
        f.id = this.world.getNextFixtureId();

        return f;

    },

    /**
    * Creates a new chain shape and adds it to this Body.
    * It will use the World friction, restitution and density by default.
    *
    * @method Phaser.Physics.Box2D.Body#addChain
    * @param {Array} vertices - Local positions of the vertices relative to the body center. Format is [x1, y1, x2, y2, ...]
    * @param {number} [firstIndex=0] - The index of the x-value of the starting vertex.
    * @param {number} [count] - The number of vertices to use. If this parameter is not passed, all vertices above firstIndex will be used.
    * @param {boolean} [loop=false] - Whether the chain should form a closed loop.
    * @return {box2d.b2Fixture} The fixture that was added to the Body.
    */
    addChain: function (vertices, firstIndex, count, loop) {
    
        if (typeof vertices === 'undefined') { return null; }
        if (vertices.length < 4) { return null; }
    
        if (typeof firstIndex === 'undefined') { firstIndex = 0; }
        if (typeof count === 'undefined') { count = (vertices.length - firstIndex) / 2; }

        var b2Vertices = [];
        for (var i = firstIndex; i < (firstIndex+count); i++) {
            b2Vertices.push( new box2d.b2Vec2(this.world.pxm(-vertices[2*i]), this.world.pxm(-vertices[2*i+1])) );
        }

        var chainShape = new box2d.b2ChainShape();
        if (loop) {
            chainShape.CreateLoop( b2Vertices, b2Vertices.length );
        }
        else {
            chainShape.CreateChain( b2Vertices, b2Vertices.length );
        }

        var fixtureDef = new box2d.b2FixtureDef();
        fixtureDef.shape = chainShape;
        fixtureDef.friction = this.world.friction;
        fixtureDef.restitution = this.world.restitution;
        fixtureDef.density = this.world.density;

        var f = this.data.CreateFixture(fixtureDef);
        f.id = this.world.getNextFixtureId();
        return f;

    },

    /**
    * Creates a new loop shape and adds it to this Body.
    *
    * @method Phaser.Physics.Box2D.Body#addLoop
    * @param {Array} vertices - Local positions of the vertices relative to the body center. Format is [x1, y1, x2, y2, ...]
    * @param {number} [firstIndex=0] - The index of the x-value of the starting vertex.
    * @param {number} count - The number of vertices to use. If this parameter is not passed, all vertices above firstIndex will be used.
    * @return {box2d.b2Fixture} The fixture that was added to the Body.
    */
    addLoop: function (vertices, firstIndex, count) {
        
        return this.addChain(vertices, firstIndex, count, true);
        
    },

    /**
    * Creates a new polygon shape and adds it to this Body.
    *
    * @method Phaser.Physics.Box2D.Body#addPolygon
    * @param {Array} vertices - Local positions of the vertices relative to the body center. Format is [x1, y1, x2, y2, ...]
    * @param {number} [firstIndex=0] - The index of the x-value of the starting vertex.
    * @param {number} count - The number of vertices to use. If this parameter is not passed, all vertices above firstIndex will be used.
    * @return {box2d.b2Fixture} The last fixture that was added to the Body.
    */
    addPolygon: function (vertices, firstIndex, count) {
    
        if (typeof vertices === 'undefined') { return null; }
        if (vertices.length < 6) { return null; } // need at least three vertices
    
        if (typeof firstIndex === 'undefined') { firstIndex = 0; }
        if (typeof count === 'undefined') { count = (vertices.length - firstIndex) / 2; }

        var b2Vertices = [];
        for (var i = firstIndex; i < (firstIndex+count); i++) {
            b2Vertices.push( { x: this.world.pxm(-vertices[2*i]), y: this.world.pxm(-vertices[2*i+1]) } );
        }
        
        var poly = new Phaser.Physics.Box2D.Polygon();
        poly.setFromXYObjects(b2Vertices);
        var convexPolygons = poly.decompose(b2Vertices);
        
        var lastFixture = null;
        
        for (var i = 0; i < convexPolygons.length; i++)
        {
            var polygonShape = new box2d.b2PolygonShape();
            polygonShape.Set( convexPolygons[i], convexPolygons[i].length );
    
            var fixtureDef = new box2d.b2FixtureDef();
            fixtureDef.shape = polygonShape;
            fixtureDef.friction = this.world.friction;
            fixtureDef.restitution = this.world.restitution;
            fixtureDef.density = this.world.density;
    
            lastFixture = this.data.CreateFixture(fixtureDef);
            lastFixture.id = this.world.getNextFixtureId();
        }

        return lastFixture;
    },

    /**
    * Remove a shape from the body. Will automatically update the mass properties and bounding radius.
    *
    * @method Phaser.Physics.Box2D.Body#removeFixture
    * @param {box2d.b2Fixture} fixture - The fixture to remove from the body.
    * @return {boolean} True if the fixture was found and removed, else false.
    */
    removeFixture: function (fixture) {

        if ( fixture.GetBody() != this.data ) {
            return false;
        }
    
        this.data.DestroyFixture(fixture);

        return true;
    },

    /**
    * Clears any previously set fixtures. Then creates a new Circle shape and adds it to this Body.
    *
    * @method Phaser.Physics.Box2D.Body#setCircle
    * @param {number} [radius=32] - The radius of this circle in pixels.
    * @param {number} [offsetX=0] - Local horizontal offset of the shape relative to the body center of mass.
    * @param {number} [offsetY=0] - Local vertical offset of the shape relative to the body center of mass.
    * @return {box2d.b2Fixture} The fixture that was added to the Body.
    */
    setCircle: function (radius, offsetX, offsetY) {
    
        if (typeof radius === 'undefined') { radius = 32; }
        if (typeof offsetX === 'undefined') { offsetX = 0; }
        if (typeof offsetY === 'undefined') { offsetY = 0; }
    
        this.clearFixtures();

        return this.addCircle(radius, offsetX, offsetY);

    },

    /**
    * Clears any previously set fixtures. The creates a new Rectangle fixture at the given size and offset, and adds it to this Body.
    * If you wish to create a Rectangle to match the size of a Sprite or Image see Body.setRectangleFromSprite.
    *
    * @method Phaser.Physics.Box2D.Body#setRectangle
    * @param {number} [width=16] - The width of the rectangle in pixels.
    * @param {number} [height=16] - The height of the rectangle in pixels.
    * @param {number} [offsetX=0] - Local horizontal offset of the shape relative to the body center of mass.
    * @param {number} [offsetY=0] - Local vertical offset of the shape relative to the body center of mass.
    * @param {number} [rotation=0] - Local rotation of the shape relative to the body center of mass, specified in radians.
    * @return {box2d.b2Fixture} The fixture that was added to the Body.
    */
    setRectangle: function (width, height, offsetX, offsetY, rotation) {

        this.clearFixtures();

        return this.addRectangle(width, height, offsetX, offsetY, rotation);

    },

    /**
    * Clears any previously set fixtures.
    * Then creates a Rectangle shape sized to match the dimensions and orientation of the Sprite given.
    * If no Sprite is given it defaults to using the parent of this Body.
    *
    * @method Phaser.Physics.Box2D.Body#setRectangleFromSprite
    * @param {Phaser.Sprite|Phaser.Image} [sprite] - The Sprite on which the Rectangle will get its dimensions.
    * @return {box2d.b2Fixture} The fixture that was added to the Body.
    */
    setRectangleFromSprite: function (sprite) {

        if (typeof sprite === 'undefined') { sprite = this.sprite; }

        this.clearFixtures();

        return this.addRectangle(sprite.width, sprite.height, 0, 0, sprite.rotation);

    },

    /**
    * Clears any previously set fixtures. Then creates a new edge shape and adds it to this Body.
    *
    * @method Phaser.Physics.Box2D.Body#setEdge
    * @param {number} [x1=0] - Local horizontal offset of the first point relative to the body center.
    * @param {number} [y1=0] - Local vertical offset of the first point relative to the body center.
    * @param {number} [x2=0] - Local horizontal offset of the second point relative to the body center.
    * @param {number} [y2=0] - Local vertical offset of the second point relative to the body center.
    * @return {box2d.b2Fixture} The fixture that was added to the Body.
    */
    setEdge: function (x1, y1, x2, y2) {
    
        if (typeof x1 === 'undefined') { x1 = 0; }
        if (typeof y1 === 'undefined') { y1 = 0; }
        if (typeof x2 === 'undefined') { x2 = 0; }
        if (typeof y2 === 'undefined') { y2 = 0; }
    
        this.clearFixtures();        

        return this.addEdge(x1, y1, x2, y2);

    },

    /**
    * Clears any previously set fixtures. Then creates a new chain shape and adds it to this Body.
    *
    * @method Phaser.Physics.Box2D.Body#setChain
    * @param {Array} vertices - Local positions of the vertices relative to the body center. Format is [x1, y1, x2, y2, ...]
    * @param {number} [firstIndex=0] - The index of the x-value of the starting vertex.
    * @param {number} count - The number of vertices to use. If this parameter is not passed, all vertices above firstIndex will be used.
    * @param {boolean} [loop=false] - Whether the chain should form a closed loop.
    * @return {box2d.b2Fixture} The fixture that was added to the Body.
    */
    setChain: function (vertices, firstIndex, count, loop) {
    
        if (typeof vertices === 'undefined') { return null; }
        if (vertices.length < 4) { return null; }
    
        if (typeof firstIndex === 'undefined') { firstIndex = 0; }
        if (typeof count === 'undefined') { count = (vertices.length - firstIndex) / 2; }
    
        this.clearFixtures();

        return this.addChain(vertices, firstIndex, count, loop);

    },

    /**
    * An alias for setChain.
    *
    * @method Phaser.Physics.Box2D.Body#setLoop
    * @param {Array} vertices - Local positions of the vertices relative to the body center. Format is [x1, y1, x2, y2, ...]
    * @param {number} [firstIndex=0] - The index of the x-value of the starting vertex.
    * @param {number} count - The number of vertices to use. If this parameter is not passed, all vertices above firstIndex will be used.
    * @return {box2d.b2Fixture} The fixture that was added to the Body.
    */
    setLoop: function (vertices, firstIndex, count) {
        
        return this.setChain(vertices, firstIndex, count, true);
        
    },

    /**
    * Clears any previously set fixtures. Then creates a new polygon shape and adds it to this Body.
    *
    * @method Phaser.Physics.Box2D.Body#setPolygon
    * @param {Array} vertices - Local positions of the vertices relative to the body center. Format is [x1, y1, x2, y2, ...]
    * @param {number} [firstIndex=0] - The index of the x-value of the starting vertex.
    * @param {number} count - The number of vertices to use. If this parameter is not passed, all vertices above firstIndex will be used.
    * @return {box2d.b2Fixture} The fixture that was added to the Body.
    */
    setPolygon: function (vertices, firstIndex, count) {
    
        if (typeof vertices === 'undefined') { return null; }
        if (vertices.length < 4) { return null; }
    
        if (typeof firstIndex === 'undefined') { firstIndex = 0; }
        if (typeof count === 'undefined') { count = (vertices.length - firstIndex) / 2; }
    
        this.clearFixtures();

        return this.addPolygon(vertices, firstIndex, count);

    },

    /**
    * Reads the shape data from a physics data file stored in the Game.Cache and adds it as a polygon to this Body.
    *
    * @method Phaser.Physics.Box2D.Body#loadPolygon
    * @param {string} key - The key of the Physics Data file as stored in Game.Cache.
    * @param {string} object - The key of the object within the Physics data file that you wish to load the shape data from.
    * @return {boolean} True on success, else false.
    */
    loadPolygon: function (key, object, sprite) {

        if (typeof sprite === 'undefined') { sprite = null; }
    
        var data = this.game.cache.getPhysicsData(key, object);

        for (var i = 0; i < data.length; i++)
        {
            var vertices = [];

            for (var s = 0; s < data[i].shape.length; s += 2)
            {
                vertices.push( new box2d.b2Vec2( this.world.pxm(-data[i].shape[s]), this.world.pxm(-data[i].shape[s + 1]) ) );
            }

            if (sprite) {
                var offsetx = this.world.pxm(-0.5 * sprite.width);
                var offsety = this.world.pxm(-0.5 * sprite.height);
                for (var k = 0; k < vertices.length; k++) {
                    vertices[k].x -= offsetx;
                    vertices[k].y -= offsety;
                }
            }

            var polygonShape = new box2d.b2PolygonShape();
            polygonShape.Set(vertices, vertices.length);
    
            var fixtureDef = new box2d.b2FixtureDef();
            fixtureDef.shape = polygonShape;
            fixtureDef.friction = data[i].friction;
            fixtureDef.restitution = data[i].bounce;
            fixtureDef.density = data[i].density;
            fixtureDef.filter.categoryBits = data[i].filter.categoryBits;
            fixtureDef.filter.maskBits = data[i].filter.maskBits;

            var f = this.data.CreateFixture(fixtureDef);
            f.id = this.world.getNextFixtureId();
        }

        return true;

    },

    /**
    * Checks if the given point (pixel coords) is contained by any of the fixtures on this body.
    * Not efficient for checking a large number of bodies to find which is under the mouse. (Use
    * Phaser.Physics.Box2D.getBodiesAtPoint for that.)
    *
    * @method Phaser.Physics.Box2D.Body#containsPoint
    * @param {Phaser.Pointer} point - The location to test for (pixel coordinates)
    * @return {boolean} True on success, else false.
    */
    containsPoint: function (point) {
        
        var worldx = this.world.pxm(-point.x);
        var worldy = this.world.pxm(-point.y);
        var worldPoint = new box2d.b2Vec2(worldx, worldy);
        
        for (var f = this.data.GetFixtureList(); f; f = f.GetNext())
        {
            if (f.TestPoint(worldPoint))
            {
                return true;
            }
        }
        
        return false;

    }

};

Phaser.Physics.Box2D.Body.prototype.constructor = Phaser.Physics.Box2D.Body;

/**
* @name Phaser.Physics.Box2D.Body#static
* @property {boolean} static - Returns true if the Body is static. Setting Body.static to 'false' will make it dynamic.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "static", {

    get: function () {

        return (this.data.GetType() === box2d.b2BodyType.b2_staticBody);

    },

    set: function (value) {

        if (value && this.data.GetType() !== box2d.b2BodyType.b2_staticBody)
        {
            this.data.SetType(box2d.b2BodyType.b2_staticBody);
        }
        else if (!value && this.data.GetType() === box2d.b2BodyType.b2_staticBody)
        {
            this.data.SetType(box2d.b2BodyType.b2_dynamicBody);
        }

    }

});

/**
* @name Phaser.Physics.Box2D.Body#dynamic
* @property {boolean} dynamic - Returns true if the Body is dynamic. Setting Body.dynamic to 'false' will make it static.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "dynamic", {

    get: function () {

        return (this.data.GetType() === box2d.b2BodyType.b2_dynamicBody);

    },

    set: function (value) {

        if (value && this.data.GetType() !== box2d.b2BodyType.b2_dynamicBody)
        {
            this.data.SetType(box2d.b2BodyType.b2_dynamicBody);
        }
        else if (!value && this.data.GetType() === box2d.b2BodyType.b2_dynamicBody)
        {
            this.data.SetType(box2d.b2BodyType.b2_staticBody);
        }

    }

});

/**
* @name Phaser.Physics.Box2D.Body#kinematic
* @property {boolean} kinematic - Returns true if the Body is kinematic. Setting Body.kinematic to 'false' will make it static.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "kinematic", {

    get: function () {

        return (this.data.GetType() === box2d.b2BodyType.b2_kinematicBody);

    },

    set: function (value) {

        if (value && this.data.GetType() !== box2d.b2BodyType.b2_kinematicBody)
        {
            this.data.SetType(box2d.b2BodyType.b2_kinematicBody);
        }
        else if (!value && this.data.GetType() === box2d.b2BodyType.b2_kinematicBody)
        {
            this.data.SetType(box2d.b2BodyType.b2_staticBody);
        }

    }

});


/**
* The angle of the Body in degrees from its original orientation. Values from 0 to 180 represent clockwise rotation; values from 0 to -180 represent counterclockwise rotation.
* Values outside this range are added to or subtracted from 360 to obtain a value within the range. For example, the statement Body.angle = 450 is the same as Body.angle = 90.
* If you wish to work in radians instead of degrees use the property Body.rotation instead. Working in radians is faster as it doesn't have to convert values.
*
* @name Phaser.Physics.Box2D.Body#angle
* @property {number} angle - The angle of this Body in degrees.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "angle", {

    get: function() {

        return Phaser.Math.wrapAngle(Phaser.Math.radToDeg(this.data.GetAngle()));

    },

    set: function(value) {

        this.data.SetAngle( Phaser.Math.degToRad(Phaser.Math.wrapAngle(value)) );

    }

});

/**
* Linear damping acts like drag to cause a body to slow down.
* @name Phaser.Physics.Box2D.Body#linearDamping
* @property {number} linearDamping - The linear damping acting acting on the body.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "linearDamping", {

    get: function () {

        return this.data.GetLinearDamping();

    },

    set: function (value) {

        this.data.SetLinearDamping(value);

    }

});

/**
* Linear damping acts like drag to cause rotation of a body to slow down.
* @name Phaser.Physics.Box2D.Body#angularDamping
* @property {number} angularDamping - The angular damping acting acting on the body.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "angularDamping", {

    get: function () {

        return this.data.GetAngularDamping();

    },

    set: function (value) {

        this.data.SetAngularDamping(value);

    }

});

/**
* @name Phaser.Physics.Box2D.Body#angularVelocity
* @property {number} angularVelocity - The angular velocity of the body.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "angularVelocity", {

    get: function () {

        return this.data.GetAngularVelocity();

    },

    set: function (value) {

        this.data.SetAngularVelocity(value);

    }

});

/**
* @name Phaser.Physics.Box2D.Body#fixedRotation
* @property {boolean} fixedRotation - If true, the body will not rotate.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "fixedRotation", {

    get: function () {

        return this.data.IsFixedRotation();

    },

    set: function (value) {

        this.data.SetFixedRotation(value);

    }

});

/**
* @name Phaser.Physics.Box2D.Body#gravityScale
* @property {boolean} gravityScale - Set to zero to completely ignore gravity, or negative values to reverse gravity for this body.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "gravityScale", {

    get: function () {

        return this.data.GetGravityScale();

    },

    set: function (value) {

        this.data.SetGravityScale(value);

    }

});

/**
* @name Phaser.Physics.Box2D.Body#friction
* @property {number} friction - When setting, all fixtures on the body will be set to the given friction. When getting, the friction of the first fixture will be returned, or zero if no fixtures are present.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "friction", {

    get: function () {

        var fixture = this.data.GetFixtureList();
        
        if (fixture) {
            return fixture.GetFriction();
        }

        return 0;

    },

    set: function (value) {

        for (var f = this.data.GetFixtureList(); f; f = f.GetNext()) {

            f.SetFriction(value);
            f.Refilter();

        }

    }

});

/**
* @name Phaser.Physics.Box2D.Body#restitution
* @property {number} restitution - When setting, all fixtures on the body will be set to the given restitution. When getting, the restitution of the first fixture will be returned, or zero if no fixtures are present.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "restitution", {

    get: function () {

        var fixture = this.data.GetFixtureList();
        
        if (fixture) {
            return fixture.GetRestitution();
        }

        return 0;

    },

    set: function (value) {

        for (var f = this.data.GetFixtureList(); f; f = f.GetNext()) {

            f.SetRestitution(value);
            f.Refilter();

        }

    }

});

/**
* @name Phaser.Physics.Box2D.Body#sensor
* @property {boolean} sensor - When setting, all fixtures on the body will be set to the given sensor status. When getting, the sensor status of the first fixture will be returned, or false if no fixtures are present.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "sensor", {

    get: function () {

        var fixture = this.data.GetFixtureList();
        
        if (fixture) {
            return fixture.IsSensor();
        }

        return 0;

    },

    set: function (value) {

        for (var f = this.data.GetFixtureList(); f; f = f.GetNext()) {

            f.SetSensor(value);
            f.Refilter();

        }

    }

});

/**
* @name Phaser.Physics.Box2D.Body#bullet
* @property {boolean} bullet - Set to true to give the body 'bullet' status, and use continous collision detection when moving it.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "bullet", {

    get: function () {

        return this.data.IsBullet();

    },

    set: function (value) {

        this.data.SetBullet(value);

    }

});

/**
* @name Phaser.Physics.Box2D.Body#mass
* @property {number} mass - the new mass for the body. Setting this to zero will cause the body to become a static body.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "mass", {

    get: function () {

        return this.data.GetMass();

    },

    set: function (value) {
        
        if (value === 0) {
            this.data.SetType(box2d.b2BodyType.b2_staticBody);
        }
        else {
            
            // Make sure the body is dynamic, before giving it a non-zero mass.
            if (this.data.GetType() !== box2d.b2BodyType.b2_dynamicBody) {
                
                this.data.SetType(box2d.b2BodyType.b2_dynamicBody);
                
            }
        
            // Mass is determined by (area * density) of attached fixtures.
            // We need to find the current mass and scale the density of all
            // fixtures so that the overall mass matches the desired mass.
            
            var oldMass = this.data.GetMass();
            var scaleby = value / oldMass;
    
            for (var f = this.data.GetFixtureList(); f; f = f.GetNext()) {
                var oldDensity = f.GetDensity();
                f.SetDensity(oldDensity * scaleby);
            }
            
            // Make sure the new fixture densities take effect in the body
            this.data.ResetMassData();
        
        }

    }

});

/**
* The angle of the Body in radians.
* If you wish to work in degrees instead of radians use the Body.angle property instead. Working in radians is faster as it doesn't have to convert values.
*
* @name Phaser.Physics.Box2D.Body#rotation
* @property {number} rotation - The angle of this Body in radians.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "rotation", {

    get: function() {

        return this.data.GetAngle();

    },

    set: function(value) {

        this.data.SetAngle(value);

    }

});

/**
* @name Phaser.Physics.Box2D.Body#x
* @property {number} x - The x coordinate of this Body.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "x", {

    get: function () {

        return this.world.mpx(-this.data.GetPosition().x);

    },

    set: function (value) {

        this.data.SetPositionXY(this.world.pxm(-value), this.data.GetPosition().y);

    }

});

/**
* @name Phaser.Physics.Box2D.Body#y
* @property {number} y - The y coordinate of this Body.
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "y", {

    get: function () {

        return this.world.mpx(-this.data.GetPosition().y);

    },

    set: function (value) {

        this.data.SetPositionXY(this.data.GetPosition().x, this.world.pxm(-value));

    }

});

/**
* A Body can be set to collide against the World bounds automatically if this is set to true. Otherwise it will leave the World.
* Note that this only applies if your World has bounds! When getting this property, the returned value will be true if any of the
* fixtures of this body are set to collide with the world bounds.
*
* @name Phaser.Physics.Box2D.Body#collideWorldBounds
* @property {boolean} collideWorldBounds - Should the Body collide with the World bounds?
*/
Object.defineProperty(Phaser.Physics.Box2D.Body.prototype, "collideWorldBounds", {

    get: function () {

        for (var f = this.data.GetFixtureList(); f; f = f.GetNext())
        {
            var filter = f.GetFilterData();

            if (filter.maskBits & Phaser.Physics.Box2D.worldBoundsFilterCategory)
            {
                return true;
            }
        }
        
        return false;

    },

    set: function (value) {

        for (var f = this.data.GetFixtureList(); f; f = f.GetNext())
        {
            var filter = f.GetFilterData();

            if (value)
            {
                filter.maskBits |=  Phaser.Physics.Box2D.worldBoundsFilterCategory;
            }
            else
            {
                filter.maskBits &= ~Phaser.Physics.Box2D.worldBoundsFilterCategory;
            }
        }
    }

});

/**
* @author       Chris Campbell <iforce2d@gmail.com>
* @author       Richard Davey <rich@photonstorm.com>
* @copyright    2015 Photon Storm Ltd.
* @license      {@link http://choosealicense.com/licenses/no-license/|No License}
*/

/**
* A PointProxy is an internal class that allows for direct getter/setter style property access to box2d.b2Vec2 objects but inverses the values on set.
* The value of the vector is not stored in this class. Instead, it holds a reference to the object that actually stores the value, along with the functions used to get and set from that object.
*
* @xclass Phaser.Physics.Box2D.PointProxy
* @classdesc PointProxy
* @constructor
* @param {Phaser.Physics.Box2D} world - A reference to the Box2D world, used for pixel/meter conversions.
* @param {any} object - The object to bind to, which holds the actual value.
* @param {function} gettor - The function of the bound object which gets the value from it.
* @param {function} settor - The function of the bound object which sets the value in it.
*/
Phaser.Physics.Box2D.PointProxy = function (world, object, gettor, settor) {

    this.world = world;
    this.object = object;
    this.gettor = gettor;
    this.settor = settor;

};

Phaser.Physics.Box2D.PointProxy.prototype.constructor = Phaser.Physics.Box2D.PointProxy;

/**
* @name Phaser.Physics.Box2D.PointProxy#x
* @property {number} x - The x property of this PointProxy.
*/
Object.defineProperty(Phaser.Physics.Box2D.PointProxy.prototype, "x", {

    get: function () {

        return this.world.mpx(-this.gettor.call(this.object).x);

    },

    set: function (value) {
        
        var v = this.gettor.call(this.object);
        v.x = this.world.pxm(-value);
        this.settor.call(this.object, v);

    }

});

/**
* @name Phaser.Physics.Box2D.PointProxy#y
* @property {number} y - The y property of this PointProxy.
*/
Object.defineProperty(Phaser.Physics.Box2D.PointProxy.prototype, "y", {

    get: function () {

        return this.world.mpx(-this.gettor.call(this.object).y);

    },

    set: function (value) {

        var v = this.gettor.call(this.object);
        v.y = this.world.pxm(-value);
        this.settor.call(this.object, v);

    }

});

/**
* @author       Chris Campbell <iforce2d@gmail.com>
* @author       Richard Davey <rich@photonstorm.com>
* @copyright    2015 Photon Storm Ltd.
* @license      {@link http://choosealicense.com/licenses/no-license/|No License}
*/

/*
* Copyright (c) 2006-2007 Erin Catto http://www.box2d.org
*
* This software is provided 'as-is', without any express or implied
* warranty.  In no event will the authors be held liable for any damages
* arising from the use of this software.
* Permission is granted to anyone to use this software for any purpose,
* including commercial applications, and to alter it and redistribute it
* freely, subject to the following restrictions:
* 1. The origin of this software must not be misrepresented; you must not
* claim that you wrote the original software. If you use this software
* in a product, an acknowledgment in the product documentation would be
* appreciated but is not required.
* 2. Altered source versions must be plainly marked as such, and must not be
* misrepresented as being the original software.
* 3. This notice may not be removed or altered from any source distribution.
*/

/** 
 * This class implements debug drawing callbacks
 * @constructor
 * @param {number} pixelsPerMeter
 */
Phaser.Physics.Box2D.DefaultDebugDraw = function (pixelsPerMeter)
{
    this.context = null;
    this.pixelsPerMeter = pixelsPerMeter;
    this.flags = box2d.b2DrawFlags.e_shapeBit;
};

Phaser.Physics.Box2D.DefaultDebugDraw.prototype.color = new box2d.b2Color(1, 1, 1);

/**
 * Sets which aspects of the world to render
 *
 * @export 
 * @return {void}
 * @param {number} flags - a bitflag made from one or more of the following:
 *     box2d.b2DrawFlags = { e_none, e_shapeBit, e_jointBit, e_aabbBit, e_pairBit, e_centerOfMassBit, e_all }
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.SetFlags = function (flags)
{
    this.flags = flags;
};

/**
 * Gets which aspects of the world are currently set to be rendered
 *
 * @export 
 * @return {number} - the flags currently set
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.GetFlags = function ()
{
    return this.flags;
};

/**
 * Sets the canvas context to use in subsequent rendering and applies overall transform.
 *
 * @export 
 * @return {void} 
 * @param {CanvasRenderingContext2D} context
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.start = function (context)
{
    this.context = context;
    this.context.save();
    this.context.scale(-1, -1);
    this.context.scale(this.pixelsPerMeter, this.pixelsPerMeter);
};

/**
 * Resets transform state to original
 *
 * @export 
 * @return {void} 
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.stop = function ()
{
    this.context.restore();
};

/**
 * @export 
 * @return {void} 
 * @param {box2d.b2Transform} xf 
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.PushTransform = function (xf)
{
    var ctx = this.context;
    ctx.save();
    ctx.translate(xf.p.x, xf.p.y);
    ctx.rotate(xf.q.GetAngleRadians());
};

/**
 * @export 
 * @return {void} 
 * @param {box2d.b2Transform} xf 
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.PopTransform = function ()
{
    var ctx = this.context;
    ctx.restore();
};

/**
 * @export 
 * @return {void} 
 * @param {Array.<box2d.b2Vec2>} vertices 
 * @param {number} vertexCount 
 * @param {box2d.b2Color} color 
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.DrawPolygon = function (vertices, vertexCount, color)
{
    if (!vertexCount)
    {
        return;
    }

    var ctx = this.context;
    
    ctx.lineWidth = 1 / this.pixelsPerMeter;

    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);

    for (var i = 1; i < vertexCount; i++)
    {
        ctx.lineTo(vertices[i].x, vertices[i].y);
    }

    ctx.closePath();
    ctx.strokeStyle = color.MakeStyleString(1);
    ctx.stroke();
};

/**
 * @export 
 * @return {void} 
 * @param {Array.<box2d.b2Vec2>} vertices 
 * @param {number} vertexCount 
 * @param {box2d.b2Color} color 
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.DrawSolidPolygon = function (vertices, vertexCount, color)
{
    if (!vertexCount)
    {
        return;
    }

    var ctx = this.context;
    
    ctx.lineWidth = 1 / this.pixelsPerMeter;

    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);

    for (var i = 1; i < vertexCount; i++)
    {
        ctx.lineTo(vertices[i].x, vertices[i].y);
    }

    ctx.closePath();
    ctx.fillStyle = color.MakeStyleString(0.5);
    ctx.fill();
    ctx.strokeStyle = color.MakeStyleString(1);
    ctx.stroke();
};

/**
 * @export 
 * @return {void} 
 * @param {box2d.b2Vec2} center 
 * @param {number} radius 
 * @param {box2d.b2Color} color 
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.DrawCircle = function (center, radius, color)
{
    if (!radius)
    {
        return;
    }

    var ctx = this.context;

    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2, true);
    ctx.strokeStyle = color.MakeStyleString(1);
    ctx.stroke();
};

/**
 * @export 
 * @return {void} 
 * @param {box2d.b2Vec2} center 
 * @param {number} radius 
 * @param {box2d.b2Vec2} axis 
 * @param {box2d.b2Color} color 
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.DrawSolidCircle = function (center, radius, axis, color)
{
    if (!radius)
    {
        return;
    }

    var ctx = this.context;
    
    ctx.lineWidth = 1 / this.pixelsPerMeter;

    var cx = center.x;
    var cy = center.y;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.moveTo(cx, cy);
    ctx.lineTo((cx + axis.x * radius), (cy + axis.y * radius));
    ctx.fillStyle = color.MakeStyleString(0.5);
    ctx.fill();
    ctx.strokeStyle = color.MakeStyleString(1);
    ctx.stroke();
};

/**
 * @export 
 * @return {void} 
 * @param {box2d.b2Vec2} p1 
 * @param {box2d.b2Vec2} p2 
 * @param {box2d.b2Color} color 
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.DrawSegment = function (p1, p2, color)
{
    var ctx = this.context;
    
    ctx.lineWidth = 1 / this.pixelsPerMeter;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color.MakeStyleString(1);
    ctx.stroke();
};

/**
 * @export 
 * @return {void} 
 * @param {box2d.b2Transform} xf 
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.DrawTransform = function (xf)
{
    var ctx = this.context;
    
    ctx.lineWidth = 1 / this.pixelsPerMeter;

    this.PushTransform(xf);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1, 0);
    ctx.strokeStyle = box2d.b2Color.RED.MakeStyleString(1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 1);
    ctx.strokeStyle = box2d.b2Color.GREEN.MakeStyleString(1);
    ctx.stroke();

    this.PopTransform(xf);
};

/**
 * @export 
 * @return {void} 
 * @param {box2d.b2Vec2} p 
 * @param {number} size 
 * @param {box2d.b2Color} color 
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.DrawPoint = function (p, size, color)
{
    var ctx = this.context;

    ctx.fillStyle = color.MakeStyleString();
    //size /= this.m_settings.viewZoom;
    //size /= this.m_settings.canvasScale;
    var hsize = size / 2;
    ctx.fillRect(p.x - hsize, p.y - hsize, size, size);
};

/**
 * @export 
 * @return {void} 
 * @param {box2d.b2AABB} aabb 
 * @param {box2d.b2Color} color 
 */
Phaser.Physics.Box2D.DefaultDebugDraw.prototype.DrawAABB = function (aabb, color)
{
    var ctx = this.context;

    ctx.strokeStyle = color.MakeStyleString();
    var x = aabb.lowerBound.x;
    var y = aabb.lowerBound.y;
    var w = aabb.upperBound.x - aabb.lowerBound.x;
    var h = aabb.upperBound.y - aabb.lowerBound.y;
    ctx.strokeRect(x, y, w, h);
};

/**
* @name Phaser.Physics.Box2D.DefaultDebugDraw#shapes
* @property {boolean} shapes - Specifies whether the debug draw should render shapes.
*/
Object.defineProperty(Phaser.Physics.Box2D.DefaultDebugDraw.prototype, "shapes", {

    get: function () {

        return this.flags & box2d.b2DrawFlags.e_shapeBit;

    },

    set: function (value) {

        if (value)
        {
            this.flags |= box2d.b2DrawFlags.e_shapeBit;
        }
        else
        {
            this.flags &= ~box2d.b2DrawFlags.e_shapeBit;
        }

    }

});

/**
* @name Phaser.Physics.Box2D.DefaultDebugDraw#joints
* @property {boolean} joints - Specifies whether the debug draw should render joints.
*/
Object.defineProperty(Phaser.Physics.Box2D.DefaultDebugDraw.prototype, "joints", {

    get: function () {

        return this.flags & box2d.b2DrawFlags.e_jointBit;

    },

    set: function (value) {

        if (value)
        {
            this.flags |= box2d.b2DrawFlags.e_jointBit;
        }
        else
        {
            this.flags &= ~box2d.b2DrawFlags.e_jointBit;
        }

    }

});

/**
* @name Phaser.Physics.Box2D.DefaultDebugDraw#aabbs
* @property {boolean} aabbs - Specifies whether the debug draw should render fixture AABBs.
*/
Object.defineProperty(Phaser.Physics.Box2D.DefaultDebugDraw.prototype, "aabbs", {

    get: function () {

        return this.flags & box2d.b2DrawFlags.e_aabbBit;

    },

    set: function (value) {

        if (value)
        {
            this.flags |= box2d.b2DrawFlags.e_aabbBit;
        }
        else
        {
            this.flags &= ~box2d.b2DrawFlags.e_aabbBit;
        }

    }

});

/**
* @name Phaser.Physics.Box2D.DefaultDebugDraw#pairs
* @property {boolean} pairs - Specifies whether the debug draw should render contact pairs.
*/
Object.defineProperty(Phaser.Physics.Box2D.DefaultDebugDraw.prototype, "pairs", {

    get: function () {

        return this.flags & box2d.b2DrawFlags.e_pairBit;

    },

    set: function (value) {

        if (value)
        {
            this.flags |= box2d.b2DrawFlags.e_pairBit;
        }
        else
        {
            this.flags &= ~box2d.b2DrawFlags.e_pairBit;
        }

    }

});

/**
* @name Phaser.Physics.Box2D.DefaultDebugDraw#centerOfMass
* @property {boolean} centerOfMass - Specifies whether the debug draw should render the center of mass of bodies.
*/
Object.defineProperty(Phaser.Physics.Box2D.DefaultDebugDraw.prototype, "centerOfMass", {

    get: function () {

        return this.flags & box2d.b2DrawFlags.e_centerOfMassBit;

    },

    set: function (value) {

        if (value)
        {
            this.flags |= box2d.b2DrawFlags.e_centerOfMassBit;
        }
        else
        {
            this.flags &= ~box2d.b2DrawFlags.e_centerOfMassBit;
        }

    }

});

/**
* @author       Chris Campbell <iforce2d@gmail.com>
* @author       Richard Davey <rich@photonstorm.com>
* @copyright    2015 Photon Storm Ltd.
* @license      {@link http://choosealicense.com/licenses/no-license/|No License}
*/

/** 
 * This class implements a contact listener. The default behaviour is to check if the two bodies
 * that contacted had a callback set up by one of the following:
 *     Phaser.Physics.Box2D.Body.createBodyContactCallback
 *     Phaser.Physics.Box2D.Body.createCategoryContactCallback
 *     Phaser.Physics.Box2D.Body.createFixtureContactCallback
 * @constructor
 */
Phaser.Physics.Box2D.DefaultContactListener = function ()
{
};

/** 
 * Called when two fixtures begin to touch. 
 * @export 
 * @return {void} 
 * @param {box2d.b2Contact} contact 
 */
Phaser.Physics.Box2D.DefaultContactListener.prototype.BeginContact = function (contact)
{
    this.handleContactBeginOrEnd(contact, true);
};

/** 
 * Called when two fixtures cease touching.
 * @export 
 * @return {void} 
 * @param {box2d.b2Contact} contact 
 */
Phaser.Physics.Box2D.DefaultContactListener.prototype.EndContact = function (contact)
{
    this.handleContactBeginOrEnd(contact, false);
};

/** 
 * Common code for begin and end contacts.
 * @export 
 * @param {box2d.b2Contact} contact 
 * @param {boolean} begin - true for a begin, false for an end 
 * @return {void} 
 */
Phaser.Physics.Box2D.DefaultContactListener.prototype.handleContactBeginOrEnd = function (contact, begin)
{
    var fA = contact.GetFixtureA();
    var fB = contact.GetFixtureB();
    var bA = fA.GetBody();
    var bB = fB.GetBody();
    var catA = fA.GetFilterData().categoryBits;
    var catB = fB.GetFilterData().categoryBits;
    var pA = bA.parent;
    var pB = bB.parent;
    
    if ( pA === void 0 || pB === void 0 ) {
        return;
    }
    
    var idA = pA.id;
    var idB = pB.id;
    
    // Check body callbacks
    if (pA._bodyContactCallbacks[idB])
    {
        pA._bodyContactCallbacks[idB].call(pA._bodyContactCallbackContext[idB], pA, pB, fA, fB, begin, contact);
    }

    if (pB._bodyContactCallbacks[idA])
    {
        pB._bodyContactCallbacks[idA].call(pB._bodyContactCallbackContext[idA], pB, pA, fB, fA, begin, contact);
    }   
        
    // Check fixture callbacks
    if (pA._fixtureContactCallbacks[fB.id])
    {
        pA._fixtureContactCallbacks[fB.id].call(pA._fixtureContactCallbackContext[fB.id], pA, pB, fA, fB, begin, contact);
    }

    if (pB._fixtureContactCallbacks[fA.id])
    {
        pB._fixtureContactCallbacks[fA.id].call(pB._fixtureContactCallbackContext[fA.id], pB, pA, fB, fA, begin, contact);
    }   
        
    if (pA._fixtureContactCallbacks[fA.id])
    {
        pA._fixtureContactCallbacks[fA.id].call(pA._fixtureContactCallbackContext[fA.id], pA, pB, fA, fB, begin, contact);
    }

    if (pB._fixtureContactCallbacks[fB.id])
    {
        pB._fixtureContactCallbacks[fB.id].call(pB._fixtureContactCallbackContext[fB.id], pB, pA, fB, fA, begin, contact);
    }
    
    // Check group callbacks
    if (pA._categoryContactCallbacks[catB])
    {
        pA._categoryContactCallbacks[catB].call(pA._categoryContactCallbackContext[catB], pA, pB, fA, fB, begin, contact);
    }

    if (pB._categoryContactCallbacks[catA])
    {
        pB._categoryContactCallbacks[catA].call(pB._categoryContactCallbackContext[catA], pB, pA, fB, fA, begin, contact);
    }
    
    if (pA._categoryContactCallbacks[catA])
    {
        pA._categoryContactCallbacks[catA].call(pA._categoryContactCallbackContext[catA], pA, pB, fA, fB, begin, contact);
    }

    if (pB._categoryContactCallbacks[catB])
    {
        pB._categoryContactCallbacks[catB].call(pB._categoryContactCallbackContext[catB], pB, pA, fB, fA, begin, contact);
    }

};

/** 
 * This is called after a contact is updated. This allows you to 
 * inspect a contact before it goes to the solver. If you are 
 * careful, you can modify the contact manifold (e.g. disable 
 * contact). 
 * @export 
 * @param {box2d.b2Contact} contact 
 * @param {box2d.b2Manifold} oldManifold 
 * @return {void} 
 */
Phaser.Physics.Box2D.DefaultContactListener.prototype.PreSolve = function (contact, oldManifold)
{
    var fA = contact.GetFixtureA();
    var fB = contact.GetFixtureB();
    var bA = fA.GetBody();
    var bB = fB.GetBody();
    var catA = fA.GetFilterData().categoryBits;
    var catB = fB.GetFilterData().categoryBits;
    var pA = bA.parent;
    var pB = bB.parent;
    
    if ( pA === void 0 || pB === void 0 ) {
        return;
    }
    
    var idA = pA.id;
    var idB = pB.id;

    // Check body callbacks
    if (pA._bodyPresolveCallbacks[idB])
    {
        pA._bodyPresolveCallbacks[idB].call(pA._bodyPresolveCallbackContext[idB], pA, pB, fA, fB, contact, oldManifold);
    }

    if (pB._bodyPresolveCallbacks[idA])
    {
        pB._bodyPresolveCallbacks[idA].call(pB._bodyPresolveCallbackContext[idA], pB, pA, fB, fA, contact, oldManifold);
    }   
        
    // Check fixture callbacks
    if (pA._fixturePresolveCallbacks[fB.id])
    {
        pA._fixturePresolveCallbacks[fB.id].call(pA._fixturePresolveCallbackContext[fB.id], pA, pB, fA, fB, contact, oldManifold);
    }

    if (pB._fixturePresolveCallbacks[fA.id])
    {
        pB._fixturePresolveCallbacks[fA.id].call(pB._fixturePresolveCallbackContext[fA.id], pB, pA, fB, fA, contact, oldManifold);
    }
    
    // Check group callbacks
    if (pA._categoryPresolveCallbacks[catB])
    {
        pA._categoryPresolveCallbacks[catB].call(pA._categoryPresolveCallbackContext[catB], pA, pB, fA, fB, contact, oldManifold);
    }

    if (pB._categoryPresolveCallbacks[catA])
    {
        pB._categoryPresolveCallbacks[catA].call(pB._categoryPresolveCallbackContext[catA], pB, pA, fB, fA, contact, oldManifold);
    }

};

/** 
 * This lets you inspect a contact after the solver is finished. 
 * @export 
 * @param {box2d.b2Contact} contact
 * @param {box2d.b2ContactImpulse} impulse
 * @return {void} 
 */
Phaser.Physics.Box2D.DefaultContactListener.prototype.PostSolve = function (contact, impulse)
{
    var fA = contact.GetFixtureA();
    var fB = contact.GetFixtureB();
    var bA = fA.GetBody();
    var bB = fB.GetBody();
    var catA = fA.GetFilterData().categoryBits;
    var catB = fB.GetFilterData().categoryBits;
    var pA = bA.parent;
    var pB = bB.parent;
    
    if ( pA === void 0 || pB === void 0 ) {
        return;
    }
    
    var idA = pA.id;
    var idB = pB.id;

    // Check body callbacks
    if (pA._bodyPostsolveCallbacks[idB])
    {
        pA._bodyPostsolveCallbacks[idB].call(pA._bodyPostsolveCallbackContext[idB], pA, pB, fA, fB, contact, impulse);
    }

    if (pB._bodyPostsolveCallbacks[idA])
    {
        pB._bodyPostsolveCallbacks[idA].call(pB._bodyPostsolveCallbackContext[idA], pB, pA, fB, fA, contact, impulse);
    }   
        
    // Check fixture callbacks
    if (pA._fixturePostsolveCallbacks[fB.id])
    {
        pA._fixturePostsolveCallbacks[fB.id].call(pA._fixturePostsolveCallbackContext[fB.id], pA, pB, fA, fB, contact, impulse);
    }

    if (pB._fixturePostsolveCallbacks[fA.id])
    {
        pB._fixturePostsolveCallbacks[fA.id].call(pB._fixturePostsolveCallbackContext[fA.id], pB, pA, fB, fA, contact, impulse);
    }
    
    // Check group callbacks
    if (pA._categoryPostsolveCallbacks[catB])
    {
        pA._categoryPostsolveCallbacks[catB].call(pA._categoryPostsolveCallbackContext[catB], pA, pB, fA, fB, contact, impulse);
    }

    if (pB._categoryPostsolveCallbacks[catA])
    {
        pB._categoryPostsolveCallbacks[catA].call(pB._categoryPostsolveCallbackContext[catA], pB, pA, fB, fA, contact, impulse);
    }

};

/**
* @author       Chris Campbell <iforce2d@gmail.com>
* @author       Richard Davey <rich@photonstorm.com>
* @copyright    2015 Photon Storm Ltd.
* @license      {@link http://choosealicense.com/licenses/no-license/|No License}
*/

/**
* A generic polygon class. Includes functions for decomposing into convex polygons.
* Use one of the 'set' functions to define the vertices.
*
* @class Phaser.Physics.Box2D.Polygon
*/
Phaser.Physics.Box2D.Polygon = function () {
    this.vertices = [];
};

/**
 * Sets the vertices of this polygon from a flat array of xy coords, eg [x, y, x, y, x, y, ...]
 * @param {Array} flatXYCoords - a flat array of xy coordinates
 */
Phaser.Physics.Box2D.Polygon.prototype.setFromFlatXYCoords = function(flatXYCoords) {

    this.vertices = [];

    for (var i = 0; i < flatXYCoords.length / 2; i++) {
        this.vertices.push( { x: flatXYCoords[2*i], y: flatXYCoords[2*i+1] } );
    }

};

/**
 * Sets the vertices of this polygon from an array of xy objects, eg [ {x, y}, {x, y}, {x, y}, ...]
 * @param {Array} xyObjects - 
 */
Phaser.Physics.Box2D.Polygon.prototype.setFromXYObjects = function(xyObjects) {
    this.vertices = xyObjects.concat();
};

/**
 * Appends a vertex to this polygon
 * @param {object} vertex - an object containing x and y number properties
 */
Phaser.Physics.Box2D.Polygon.prototype.addVertex = function(vertex) {
    this.vertices.push(vertex);
};

/**
 * Returns the vertex at the given position
 */
Phaser.Physics.Box2D.Polygon.prototype.at = function(i) {

    var s = this.vertices.length;
    return this.vertices[i < 0 ? i % s + s : i % s];

};

/**
 * Checks if two indices are adjacent or the same on this polygon
 * For example, on a polygon with 5 vertices, indices 4 and 0 are adjacent.
 * @param {number} a - first index
 * @param {number} b - second index
 * @return {boolean} true if the two indices are adjacent or equal
 */
Phaser.Physics.Box2D.Polygon.prototype.indicesAreAdjacent = function (a, b) {

    a = a % this.vertices.length;
    b = b % this.vertices.length;
    
    if ( a == b ) { return true; }
    var diff = Math.abs(a-b);
    if ( diff < 2 ) { return true; }
    if ( diff == this.vertices.length-1 ) { return true; }
    
    return false;
};

/**
 * Returns the area of the triangle formed by three vertices of this polygon.
 * Result will be negative for clockwise windings.
 * @param {number} a - index of first vertex
 * @param {number} b - index of second vertex
 * @param {number} c - index of third vertex
 * @return {number} The area of the triangle formed by the three vertices
 */
Phaser.Physics.Box2D.Polygon.prototype.areaInTriangle = function (a, b, c) {

    a = this.at(a);
    b = this.at(b);
    c = this.at(c);

    return (((b.x - a.x)*(c.y - a.y))-((c.x - a.x)*(b.y - a.y))) * 0.5;

};

/**
 * Checks if the polygon outline turns left at the given vertex, when moving around
 * the outline in counter-clockwise order. Polygon must be made CCW first!
 * @return {boolean} True if outline turns left at the given vertex
 */
Phaser.Physics.Box2D.Polygon.prototype.left = function(a, b, c) {    

    return this.areaInTriangle(a, b, c) > 0;

};

/**
 * Checks if the polygon outline turns left or stays straight at the given vertex, when moving around
 * the outline in counter-clockwise order. Polygon must be made CCW first!
 * @return {boolean} True if outline turns left at the given vertex or stays straight
 */
Phaser.Physics.Box2D.Polygon.prototype.leftOn = function(a, b, c) {

    return this.areaInTriangle(a, b, c) >= 0;

};

/**
 * Checks if the polygon outline turns right at the given vertex, when moving around
 * the outline in counter-clockwise order. Polygon must be made CCW first!
 * @return {boolean} True if outline turns right at the given vertex
 */
Phaser.Physics.Box2D.Polygon.prototype.right = function(a, b, c) {

    return this.areaInTriangle(a, b, c) < 0;

};

/**
 * Checks if the polygon outline turns right or stays straight at the given vertex, when moving around
 * the outline in counter-clockwise order. Polygon must be made CCW first!
 * @return {boolean} True if outline turns right at the given vertex or stays straight
 */
Phaser.Physics.Box2D.Polygon.prototype.rightOn = function(a, b, c) {

    return this.areaInTriangle(a, b, c) <= 0;

};

/**
 * Finds the squared distance between two points
 * @param {object} a - an object with x and y number properties
 * @param {object} b - an object with x and y number properties
 * @return {number} The square of the distance between the two points
 */
Phaser.Physics.Box2D.Polygon.sqdist = function(a, b) {

    var dx = b.x - a.x;
    var dy = b.y - a.y;

    return dx * dx + dy * dy;

};

/**
 * Ensures this polygon is wound counter-clockwise.
 * @return {boolean} true if the polygon winding was reversed
 */
Phaser.Physics.Box2D.Polygon.prototype.makeCCW = function() {
    
    // Find bottom right point
    var br = 0;

    for (var i = 1, len = this.vertices.length; i < len; i++)
    {
        if (this.at(i).y < this.at(br).y || (this.at(i).y === this.at(br).y && this.at(i).x > this.at(br).x))
        {
            br = i;
        }
    }

    // Reverse poly if clockwise
    if (!this.left(br - 1, br, br + 1))
    {
        this.vertices.reverse();
        return true;
    }
    
    return false;

};

/**
 * Checks if this polygon is convex.
 * @return {boolean} True if the polygon is convex.
 */
Phaser.Physics.Box2D.Polygon.prototype.isConvex = function () {
    
    var havePositive = false;
    var haveNegative = false;
    
    for (var i = 0, len = this.vertices.length; i < len; i++)
    {
        var i0 = i;
        var i1 = (i + 1) % len;
        var i2 = (i + 2) % len;

        if (this.areaInTriangle(this.vertices[i0], this.vertices[i1], this.vertices[i2]) > 0)
        {
            havePositive = true;
        }
        else
        {
            haveNegative = true;
        }
    }

    return haveNegative ^ havePositive;

};

/**
 * Checks if the given vertex is reflex (concave causing). Polygon must be made CCW first!
 * @param {object} i - the index of the vertex to check
 * @return {number} true if the given vertex is a reflex vertex
 */
Phaser.Physics.Box2D.Polygon.prototype.isReflex = function (i) {

    return this.right(i - 1, i, i + 1);

};

/**
 * Check if two vectors are equal.
 * @param {object} v0 - an object with x and y properties
 * @param {object} v1 - an object with x and y properties
 * @return {boolean} true if the two vector are the same
 */
Phaser.Physics.Box2D.Polygon.areVecsEqual = function(v0, v1) {

    return v0.x == v1.x && v0.y == v1.y;

};

/**
 * Check if two lines intersect each other.
 * @param {object} v0 - an object with x and y properties (first point of first line)
 * @param {object} v1 - an object with x and y properties (second point of first line)
 * @param {object} t0 - an object with x and y properties (first point of second line)
 * @param {object} t1 - an object with x and y properties (second point of second line)
 * @return {number} The intersection point, or null if the lines do not cross
 */
Phaser.Physics.Box2D.Polygon.linesCross = function(v0, v1, t0, t1) {

    if (Phaser.Physics.Box2D.Polygon.areVecsEqual(v1,t0) || Phaser.Physics.Box2D.Polygon.areVecsEqual(v0,t0) || Phaser.Physics.Box2D.Polygon.areVecsEqual(v1,t1) || Phaser.Physics.Box2D.Polygon.areVecsEqual(v0,t1))
    {
        return null;
    }

    var vnormal = {};

    box2d.b2SubVV(v1, v0, vnormal);
    box2d.b2CrossVS(vnormal, 1, vnormal);

    var v0d = box2d.b2DotVV(vnormal, v0);
    var t0d = box2d.b2DotVV(vnormal, t0);
    var t1d = box2d.b2DotVV(vnormal, t1);

    if ( t0d > v0d && t1d > v0d )
    {
        return null;
    }

    if ( t0d < v0d && t1d < v0d )
    {
        return null;
    }

    var tnormal = {};
    box2d.b2SubVV(t1, t0, tnormal);
    box2d.b2CrossVS(tnormal, 1, tnormal);

    var t0d = box2d.b2DotVV(tnormal, t0);
    var v0d = box2d.b2DotVV(tnormal, v0);
    var v1d = box2d.b2DotVV(tnormal, v1);

    if ( v0d > t0d && v1d > t0d )
    {
        return null;
    }

    if ( v0d < t0d && v1d < t0d )
    {
        return null;
    }

    var f = (t0d - v0d) / (v1d - v0d);

    var intersectionPoint = { x: v0.x + f * (v1.x-v0.x), y: v0.y + f * (v1.y-v0.y) };

    return intersectionPoint;

};

/**
 * Check if two vertices of a polygon have a clear line of sight to each other. "Line of sight" means
 * that the line between them is not intersected by any other edges of the polygon.
 * @param {Array} vertices - array of vertices representing the polygon
 * @param {number} a - index of first vertex
 * @param {number} b - index of second vertex
 * @return {boolean} true if the two vertices are not adjacent and can 'see' each other.
 */
Phaser.Physics.Box2D.Polygon.prototype.canSee = function (a, b) {

    if (this.indicesAreAdjacent(a, b) )
    {
        return false;
    }
        
    if (this.leftOn(a + 1, a, b) && this.rightOn(a - 1, a, b))
    {
        return false;
    }
    
    for (var i = 0; i < this.vertices.length; ++i)
    {
        // for each edge
        if ((i + 1) % this.vertices.length == a || i == a)
        {
            // ignore incident edges
            continue;
        } 

        if (this.leftOn(a, b, i + 1) && this.rightOn(a, b, i))
        { 
            // if diag intersects an edge
            if (Phaser.Physics.Box2D.Polygon.linesCross(this.at(a), this.at(b), this.at(i), this.at(i + 1)))
            {
                return false;
            }
        }
    }

    return true;
    
};

/** Copies a subset of the vertices of this polygon to make a new one. Start and end points will be included.
 * @param {number} i - index of the first vertex
 * @param {number} j - index of the second vertex
 * @return {Array} array representing a sub-polygon
 */
Phaser.Physics.Box2D.Polygon.prototype.subPolygon = function (i, j) {

    var p = new Phaser.Physics.Box2D.Polygon();

    if (i < j)
    {
        //p.v.insert(p.v.begin(), v.begin() + i, v.begin() + j + 1);
        for (var n = i; n < j + 1; n++)
        {
            p.addVertex( this.at(n) );
        }
    }
    else
    {
        //p.v.insert(p.v.begin(), v.begin() + i, v.end());
        //p.v.insert(p.v.end(), v.begin(), v.begin() + j + 1);
        for (var n = i; n < this.vertices.length; n++)
        {
            p.addVertex( this.at(n) );
        }

        for (var n = 0; n < j + 1; n++)
        {
            p.addVertex( this.at(n) );
        }
    }
    
    return p;

};

/**
 * Returns an array of the individual convex polygons which make up the given concave polygon.
 * This will return a near-optimal (lowest number of sub-polygons) decomposition and is
 * astoundingly slow for polygons with more than about 8 vertices. You most likely will
 * not want to use this at runtime, but it could be useful as a pre-process for something.
 * Please try the normal 'decompose' function instead.
 * @return {Array} Array of objects containing pairs of indices which should be joined
 */
Phaser.Physics.Box2D.Polygon.prototype.decomposeOptimal = function (level) {

    if (typeof level === 'undefined') { level = 0; }
    
    if (level > 1)
    {
        return this.vertices;
    }
        
    this.makeCCW();
      
    var min = [];
    var tmp1 = [];
    var tmp2 = [];    
    
    var nDiags = Number.MAX_VALUE;

    for (var i = 0; i < this.vertices.length; i++)
    {
        if (this.isReflex(i))
        {
            for (var j = 0; j < this.vertices.length; j++)
            {
                if (this.canSee(i, j))
                {
                    tmp1 = this.subPolygon(i, j).decompose(level+1);
                    tmp2 = this.subPolygon(j, i).decompose(level+1);                    

                    if (tmp1.length + tmp2.length < nDiags)
                    {
                        min = tmp1.concat(tmp2);
                        nDiags = min.length;
                    }
                }
            }
        }
    }
    
    if (min.length === 0)
    {
        min.push(this.vertices);
    }
    
    return min;

};

/**
 * Returns an array of the individual convex polygons which make up the given concave polygon.
 * @return {Array} Array of arrays containing the vertex positions of sub-polygons. Vertex positions are an object like {x,y}
 */
Phaser.Physics.Box2D.Polygon.prototype.decompose = function (level) {

    if (typeof level === 'undefined') { level = 0; }
    
    this.makeCCW();
      
    var min = [];
    
    var bestDivision = Number.MAX_VALUE;
    var bestI;
    var bestJ;
    var foundReflex = false;
    
    for (var i = 0; i < this.vertices.length; i++)
    {
        if (this.isReflex(i))
        {
            foundReflex = true;
            var v0 = this.at(i);

            for (var j = 0; j < this.vertices.length; j++)
            {
                if (this.canSee(i, j))
                {
                    var v1 = this.at(j);
                    var dx = v1.x - v0.x;
                    var dy = v1.y - v0.y;
                    var distanceSquared = (dx * dx) * (dy * dy);

                    if (distanceSquared < bestDivision)
                    {
                        bestI = i;
                        bestJ = j;
                        bestDivision = distanceSquared;
                    }
                }
            }
        }
    }
    
    // Specific to Box2D, force to 8 vertices or less
    if (!foundReflex && this.vertices.length > 8 )
    {
        bestI = 0;
        bestJ = Math.floor(this.vertices.length / 2);
        foundReflex = true;
    }
    
    if (foundReflex)
    {
        var tmp1 = this.subPolygon(bestI, bestJ).decompose(level+1);
        var tmp2 = this.subPolygon(bestJ, bestI).decompose(level+1);        
        min = tmp1.concat(tmp2);
    }
    
    if (min.length === 0)
    {
        min.push(this.vertices);
    }
    
    return min;

};
