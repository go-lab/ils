window.ude = window.ude || {};
window.ude.commons = window.ude.commons || {};

ude.commons.NotificationClient = (function() {
    NotificationClient = function(metadataHandler) {
        this.listeners = [];
        this.clientId = metadataHandler.getProvider().id + metadataHandler.getActor().id + metadataHandler.getGenerator().id;
        this._initServerConnection(this.clientId);
    };

    NotificationClient.prototype = {
        register: function(premise, callback) {
            this.listeners.push({
                premise: premise,
                callback: callback
            });
        },

        processNotification: function(notification) {
            this.listeners.some(function(listener) {
                if (listener.premise(notification)) {
                    isGreedy = listener.callback(notification);
                    if (isGreedy) {
                        return true;
                    }
                }
                return false;
            });
        },

        _initServerConnection: function(socketId) {
            var socket = io.connect('http://golab.collide.info');
            socket.on(socketId, function(data) {
                this.processNotification(data);
            }.bind(this));
        }
    };

    return NotificationClient;
})();
