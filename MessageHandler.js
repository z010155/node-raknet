class MessageHandler {
    constructor() {
        this.type = undefined;
        /**
         *
         * @param {RakServer} server
         * @param {BitStream} packet
         * @param user
         */
        this.handle = function(server, packet, user){};

    }

    static create() {
        return new this();
    }
}

module.exports = MessageHandler;