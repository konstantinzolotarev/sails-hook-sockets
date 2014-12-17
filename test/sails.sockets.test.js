/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var async = require('async');
var _ = require('lodash');

var ERRORPACK = require('../lib/errors');



describe('low-level socket methods:', function (){

  // Set up helper routes for the tests below
  before(function(){
    sails.get('/socketMethods/helpers/getIdOfRequestingSocket', function(req, res){
      return res.send(req.socket.id);
    });
  });





  // Use the globalized default sails instance
  var TEST_SERVER_PORT = 1577;


  // Connect a few additional sockets for use in the tests below
  // (these will hold **CLIENT-SIDE** SOCKETS!!)
  var starks = {
    bran: undefined,
    rob: undefined,
    arya: undefined,
    sansa: undefined,
    ricket: undefined// or whatever his name is
  };

  // Create a variable to reference our original `io.socket` (the auto-connecting guy)
  // (these will hold a **CLIENT-SIDE** SOCKET!!)
  var theKing;

  before(function (done){

    // Thematically relevant reference to `io.socket`
    theKing = io.socket;

    io.socket.on('connect', function (){
      console.log('ok, now we\'ve connected the initial socket, let\'s connect some more...');
      async.each(_.keys(starks), function (key, next){
        console.log('connecting socket for %s',key);
        starks[key] = io.sails.connect('http://localhost:'+TEST_SERVER_PORT, {
          multiplex: false
        });
        starks[key].on('connect', function(){
          console.log('socket for %s connected!', key);
          next();
        });
      }, done);
    });

  });

  after(function (){
    _.each(starks, function (starkSocket){
      starkSocket.disconnect();
    });
  });



  // •----------------------------------------•
  //
  //   ||   Nullipotent functions
  //   \/
  //
  // •----------------------------------------•


  describe('sails.sockets.get()', function (done){


    it('should throw USAGE error when called w/ no arguments', function (){
      assert.throws(function (){
        sails.sockets.get();
      }, ERRORPACK.USAGE.constructor);
    });
    it('should throw USAGE error when called w/ invalid socket id', function (){
      assert.throws(function (){
        sails.sockets.get([
          {
            something:'totally invalid'
          }
        ]);
      }, ERRORPACK.USAGE.constructor);
    });

    it('should return undefined when called w/ string or integer id which does not correspond w/ real socket', function (){
      assert.throws(function (){
        sails.sockets.get(7);
      }, ERRORPACK.NO_SUCH_SOCKET.constructor);
      assert.throws(function (){
        sails.sockets.get('7');
      }, ERRORPACK.NO_SUCH_SOCKET.constructor);
    });

    it('should return a Socket when called w/ a socket id which points to a real socket', function (done){

      _getSocketId(theKing, function (err, socketId) {
        if (err) return done(err);
        try {
          var socket = sails.sockets.get(socketId);
          assert(socket, 'expected socket to exist');
          assert(_.isString(socket.id), 'expected socket to look like a real Socket');
          assert(_.isFunction(socket.emit), 'expected socket to look like a real Socket');
        }
        catch (e) {
          return done(e);
        }
        return done();
      });
    });

  });


  describe('sails.sockets.id()', function (done){

    var actualSocketId;
    before(function (){
      sails.get('/socketMethods/sails.sockets.id', function (req, res){
        actualSocketId = req.socket.id;

        var result1 = sails.sockets.id(req.socket);
        assert.equal(result1, actualSocketId);

        var result2 = sails.sockets.id(req);
        assert.equal(result2, result1);

        return res.send(result1);
      });
    });

    it('should not crash or throw', function (done){
      theKing.get('/socketMethods/sails.sockets.id', function (data, jwr){
        if (jwr.error) return done(jwr.error);
        return done();
      });
    });

    it('should return a string', function (done){
      theKing.get('/socketMethods/sails.sockets.id', function (data, jwr){
        if (jwr.error) return done(jwr.error);
        assert(typeof data === 'string', 'should have returned a string, but instead got:'+data);
        return done();
      });
    });

    it('should return the proper socket id', function (done){
      theKing.get('/socketMethods/sails.sockets.id', function (data, jwr){
        if (jwr.error) return done(jwr.error);
        assert.equal(data, actualSocketId, 'should have returned the proper socketId ('+actualSocketId+'), but instead got:'+data);
        return done();
      });
    });

  });




  describe('sails.sockets.join()', function (){
    before(function _setupRoutes(){
      sails.put('/socketMethods/join', function (req, res){
        console.log('socket %s joining room %s', sails.sockets.id(req.socket), req.param('room'));
        sails.sockets.join(req.socket, req.param('room'));
        return res.send();
      });
    });
    //
    // we'll use bran for this one
    //
    it('should not crash', function (done){
      starks.bran.put('/socketMethods/join', {
        room: 'test'
      }, function (data, jwr) {
        if (jwr.error) return done(jwr.error);
        return done();
      });
    });
  });




  describe('sails.sockets.socketRooms()', function (done){
    before(function(){
      sails.get('/socketMethods/socketRooms', function(req, res){
        console.log('socket %s checking room membership...', sails.sockets.id(req.socket));
        var result1 = sails.sockets.socketRooms(req.socket);
        var result2 = sails.sockets.socketRooms(req);
        assert.equal(result2, result1);
        return res.send(result1);
      });
    });
    it('should not crash or throw', function (done){
      theKing.get('/socketMethods/socketRooms', function (data, jwr) {
        if (jwr.error) return done(jwr.error);
        return done();
      });
    });
    it('should return expected room membership before joining any rooms (1)', function (done){
      theKing.get('/socketMethods/socketRooms', function (data, jwr) {
        if (jwr.error) return done(jwr.error);
        assert.equal(data.length,1, 'expected it to return a membership of 1 room; instead got '+util.inspect(data, false, null));
        return done();
      });
    });
    it('should return expected room membership after joining some rooms', function (done){
      theKing.put('/socketMethods/join', { room: 'beast1' }, function (data, jwr) {
        theKing.put('/socketMethods/join', { room: 'beast2' }, function (data, jwr) {
          theKing.get('/socketMethods/socketRooms', function (data, jwr) {
            if (jwr.error) return done(jwr.error);
            assert.equal(data.length, 3, 'expected it to return a membership of 3 rooms; instead got '+data.length);
            return done();
          });
        });
      });
    });
    it('should properly isolate room membership of different sockets', function (done){
      starks.bran.get('/socketMethods/socketRooms',function (data, jwr) {
        if (jwr.error) return done(jwr.error);
        assert.equal(data.length, 2, 'expected it to return a membership of 2 rooms; instead got '+data.length);
        return done();
      });
    });
  });




  describe('sails.sockets.rooms()', function (done){
    before(function(){
      sails.get('/socketMethods/rooms', function(req, res){
        return res.send();
      });
    });
    it('should not crash', function (done){
      io.socket.get('/socketMethods/rooms', function (data, jwr) {
        done();
      });
    });
  });




  describe('sails.sockets.subscribers()', function (done){
    before(function(){
      sails.get('/socketMethods/subscribers', function(req, res){
        return res.send();
      });
    });
    it('should not crash', function (done){
      io.socket.get('/socketMethods/subscribers', function (data, jwr) {
        done();
      });
    });
  });



  describe('sails.sockets.leave()', function (done){
    before(function(){
      sails.post('/socketMethods/leave', function(req, res){
        return res.send();
      });
    });
    it('should not crash', function (done){
      io.socket.post('/socketMethods/leave', function (data, jwr) {
        done();
      });
    });
  });




  describe('sails.sockets.broadcast()', function (done){
    before(function(){
      sails.post('/socketMethods/broadcast', function(req, res){
        return res.send();
      });
    });
    it('should not crash', function (done){
      io.socket.post('/socketMethods/broadcast', function (data, jwr) {
        done();
      });
    });
  });




  describe('sails.sockets.emit()', function (done){
    before(function(){
      sails.post('/socketMethods/emit', function(req, res){
        return res.send();
      });
    });
    it('should not crash', function (done){
      io.socket.post('/socketMethods/emit', function (data, jwr) {
        done();
      });
    });
  });




  describe('sails.sockets.blast()', function (done){
    before(function(){
      sails.post('/socketMethods/blast', function(req, res){
        return res.send();
      });
    });
    it('should not crash', function (done){
      io.socket.post('/socketMethods/blast', function (data, jwr) {
        done();
      });
    });
  });


});






// Helper methods:
//

/**
 * Given a client-side socket, get its socket id.
 *
 * @param  {[type]}   clientSocket [description]
 * @param  {Function} cb           [description]
 * @return {[type]}                [description]
 */
function _getSocketId(clientSocket, cb){
  clientSocket.get('/socketMethods/helpers/getIdOfRequestingSocket', function (data, jwr){
    if (jwr.statusCode < 200 || jwr.statusCode > 300 || !jwr.body) {
      return cb(new Error('Unexpected result from test helper (statusCode='+jwr.statusCode+', body='+util.inspect(jwr.body, false, null)+')'));
    }
    return cb(null, jwr.body);
  });
}
