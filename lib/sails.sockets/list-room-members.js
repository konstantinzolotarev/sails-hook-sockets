/**
 * Module dependencies
 */

var _ = require('lodash');




module.exports = function (app){


  /**
   * Get the list of sockets subscribed to a room
   * @param  {string} roomName The room to get subscribers of
   * @param  {boolean} returnSockets If true, return socket instances rather than IDs.
   * @return {array} An array of socket ID strings
   */
  return function listRoomMembers (roomName, returnSockets) {

    // The underlying implementation was changed a bit with the upgrade
    // to Socket.io v1.0.  For more information, see:
    //  •-> https://github.com/Automattic/socket.io/issues/1908#issuecomment-66836641
    // and •-> https://github.com/Automattic/socket.io/pull/1630#issuecomment-64389524

    // Since socket.io v1.4, a room is an object w/ "sockets" and "length" keys
    var room = app.io.nsps['/'].adapter.rooms[roomName];
    // Grab array of socket IDs from the room object if the room is valid,
    // otherwise return an empty array
    var socketIds = room ? _.keys(app.io.nsps['/'].adapter.rooms[roomName].sockets) : [];
    if (returnSockets) {
      var sockets = [];
      _.each(socketIds, function (id) {
        sockets.push(app.io.nsps['/'].adapter.nsp.connected[id+'']);
      });
      return sockets;
    } else {
      return socketIds;
    }
  };

};
