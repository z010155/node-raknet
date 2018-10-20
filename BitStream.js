/**
 * The BitStream class used for reading data from a Buffer.
 */
class BitStream {
    /**
     * Creates a new instance of the BitStream class and sets up the default values for some variables
     * @param {Buffer} data
     */
    constructor(data = undefined) {
        if(data !== undefined) {
            this.data = data;
        }
        else {
            this.data = Buffer.alloc(0);
        }
        this._byteCount = this.data.length;
        //for reading data
        this._rBytePos = 0;
        this._rBitPos = 7;
        //for writing data
        this._wBytePos = 0;
        this._wBitPos = 7;
        this._mask = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80];

        this._byte = this._byteCount ? this.data.readUInt8(0) : undefined;
    }

    /**
     * Returns the length of this BitStream
     * @returns {Number}
     */
    length() {
        return this._byteCount;
    }

    /**
     * Gets the number of bits in this stream
     * @returns {Number}
     */
    bits() {
        return this._wBytePos * 8 + (8 - this._wBitPos) - 1;
    }

    /**
     * Returns true if we are at the end of the stream
     * @returns {Boolean}
     */
    allRead() {
        return this._rBytePos * 8 + this._rBitPos >= this._byteCount * 8 - 1;
    }

    /**
     * Reads a single bit from the Buffer
     * @returns {Number}
     */
    readBit() {
        if (this._rBytePos >= this._byteCount) {
            this._wBytePos = this._rBytePos;
            this.writeByte(0);
        }

        let byte = this.data.readUInt8(this._rBytePos);
        let bit = (byte & this._mask[this._rBitPos]) >> this._rBitPos;
        if (--this._rBitPos === -1) {
            this._rBitPos = 7;
            this._rBytePos++;
        }
        return bit;
    }

    /**
     * Writes a single bit to the buffer
     * @param {boolean} b The bit to write
     */
    writeBit(b) {
        if(typeof(b) !== "boolean") {
            throw new Error("BitStream writeBit was not passed a boolean");
        }
        //if the wBitPos is in the first bit position, we have rolled over
        if(this._wBitPos === 7) {

            //increase the buffer size...
            let old = this.data;
            this.data = Buffer.alloc(this._wBytePos + 1);
            this._byteCount = this._wBytePos + 1;

            old.copy(this.data);

            for(let i = 0; i < this._wBytePos; i ++) {
                this.data.writeUInt8(old.readUInt8(i), i); //copy over into new Buffer
            }

            this.data.writeUInt8(0, this._wBytePos);

        }
        //now we need to get the current byte...
        let byte = this.data.readUInt8(this._wBytePos);

        //set the bit
        byte |= b << this._wBitPos;

        //write the byte
        this.data.writeUInt8(byte, this._wBytePos);

        //move to next bit
        this._wBitPos --;

        //if we are done writing this byte, move to the next one
        if(this._wBitPos < 0) {
            this._wBitPos = 7;
            this._wBytePos ++;
        }
    }

    /**
     * Reads multiple bits from the buffer
     * @param {Number} n The number of bits to read
     * @returns {Number}
     */
    readBits(n) {
        let val = 0;
        if(this._rBytePos < this._byteCount) this._byte = this.data.readUInt8(this._rBytePos);

        while (n--) {
            let bit = this.readBit();
            val = (val << 1) | bit;
        }
        return val;
    }

    /**
     * Writes number to stream with a certain amount of bits
     * @param {Number} n The number to write to the stream
     * @param {Number} b The number of bits to write
     */
    writeBits(n, b) {
        for(let i = b; i > 0; i --) {
            let temp = (n >> (i - 1)) & 0x01;
            this.writeBit(temp === 1);
        }
    }

    /**
     * Reads bits in reverse
     * @param {Number} n The number of bits to read
     * @returns {Number}
     */
    readBitsReversed(n) {
        let val = 0;

        // Don't know why I need this here, but I do
        for (let i = 0; i < n; i ++) {
            let bit = this.readBit();
            val |= (bit << i);
        }
        return val;
    }

    /**
     * Don't ask...
     * @param ret
     * @param n
     * @param b
     * @returns {*}
     */
    readBitsStream(ret, n, b = true) {
        if(n <= 0) return undefined;
        if(this._rBytePos + Math.floor(n/8) > this._byteCount) return undefined;

        let c = 0;
        while(n > 0) {
            if(n >= 8) {
                ret.writeByteOffset(this.readByte(), c);
                n -= 8;
                c++;
            } else {
                let neg = n - 8;
                if(neg < 0) {
                    if(b) {
                        ret.writeByteOffset(ret.readByteOffset(c) >> -neg, c);
                        this._rBytePos += 8 + neg;
                    } else {
                        this._rBytePos += 8;
                    }
                }
                n = 0;
            }
        }
        return ret;
    }

    /**
     * Reads a byte from the buffer
     * @returns {Number}
     */
    readByte() {
        return this.readBits(8);
    }

    /**
     * Read a byte at a given offset
     * @param {Number} o Offset byte
     * @returns {Number}
     */
    readByteOffset(o) {
        return this.data.readUInt8(o);
    }

    /**
     * Read number of bytes to a new stream
     * @param {Number} n Number of bytes
     * @returns {BitStream}
     */
    readBytes(n) {
        let val = new BitStream();
        while(n-- && this._rBytePos < this.length()) {
            val.writeByte(this.readByte());
        }
        return val;
    }

    /**
     * Writes a byte to the stream
     * @param {Number} n The byte to write to the stream
     */
    writeByte(n) {
        //we have to build an array of true and false... or we can just left shift it and do it that way
        for(let i = 0; i < 8; i++) {
            let t = (n & 0x80) >>> 7; //get the leftmost bit and put it on the right
            this.writeBit(t === 1);
            n <<= 1; //move to next bit...
            n &= 0xFF; //ensure we are only looking at a byte...
        }
    }

    /**
     * Writes a byte a offset
     * @param {Number} n Byte to write
     * @param {Number} o Offset to write at
     */
    writeByteOffset(n, o) {
        if(o + 1> this.length()) { //we are trying to write outside the current size... resizing to fix...
            this.data = Buffer.alloc(o + 1, 0);
            this._byteCount = this._wBytePos + 1;

            for(let i = 0; i < this._wBytePos; i ++) {
                this.data.writeUInt8(old.readUInt8(i), i); //copy over into new Buffer
            }
            this._byteCount = o + 1;
        }
        this.data.writeUInt8(n, o);
    }

    /**
     * Reads a character from the stream
     * @returns {Number}
     */
    readChar() {
        return this.readBits(8);
    }

    /**
     * Writes a boolean to the stream
     * @param {Boolean} n
     */
    writeBoolean(n) {
        if(n === true) {
            this.writeByte(1);
        } else {
            this.writeByte(0);
        }
    }

    /**
     * Reads a boolean from the stream
     * @returns {boolean}
     */
    readBoolean() {
        return this.readByte() === true;
    }

    /**
     * Writes a character to the stream
     * @param {Number} n Character to write
     */
    writeChar(n) {
        this.writeByte(n);
    }

    /**
     * Reads a signed character from the stream
     * @returns {Number}
     */
    readSignedChar() {
        if(this.readBit()) {
            return -this.readBits(7)
        }
        return this.readBits(7);
    }

    /**
     * Reads an unsigned short from the stream
     * @returns {Number}
     */
    readShort() {
        return this.readByte() +
            (this.readByte() << 8);
    }

    /**
     * Writes an unsigned short to the stream
     * @param {Number} n The number to write
     */
    writeShort(n) {
        this.writeByte(n & 0xff); //write the bottom byte
        this.writeByte((n & 0xff00) >>> 8); //write the top byte
    }

    /**
     * Writes a compressed short to this stream
     * @param {Number} n The short to compress
     */
    writeCompressedShort(n) {
        this.writeCompressed(n, 2);
    }

    /**
     * Reads a signed short from the stream
     * @returns {Number}
     */
    readSignedShort() {
        let firstByte = this.readByte();
        if(this.readBit()) {
            return -(firstByte & (this.readBits(7) << 7));
        }
        return firstByte & (this.readBits(7) << 7);
    }

    /**
     * Reads an unsigned long from the stream
     * @returns {Number}
     */
    readLong() {
        return this.readByte() +
            (this.readByte() << 8) +
            (this.readByte() << 16) +
            (this.readByte() * 16777216); // Had to do this because shifting it over 24 places causes it to return a signed value because JavsScript treats numbers in bitshift as 32bit
    }

    /**
     * Writes an unsigned long to the stream
     * @param {Number} n The number to write
     */
    writeLong(n) {
        this.writeShort(n & 0xffff); //write the lower two bytes...
        this.writeShort((n & 0xffff0000) >>> 16); //write the top two bytes
    }

    /**
     * Writes a compressed long to this stream
     * @param {Number} n The long to compress and write to to this stream
     */
    writeCompressedLong(n) {
        this.writeCompressed(n, 4);
    }

    /**
     * Currently not implemented
     */
    readSignedLong() {
        //lol no
    }

    /**
     * Reads an unsigned long long from the stream
     * @returns {Number}
     */
    readLongLong() {
        return this.readByte() +
            (this.readByte() << 8) +
            (this.readByte() << 16) +
            (this.readByte() * 16777216) +
            (this.readByte() * 4294967296) +
            (this.readByte() * 1099511627776) +
            (this.readByte() * 281474976710656) +
            (this.readByte() * 72057594037927936);
    }

    /**
     * Writes an unsigned long long to the stream
     * @param {Number} top The top of the number
     * @param {Number} bottom The bottom of the number
     */
    writeLongLong(top, bottom) {
        this.writeLong(bottom);
        this.writeLong(top);
    }

    /**
     * Reads a float from the stream
     * @returns {Number}
     */
    readFloat() {
        let mantissa = this.readShort();
        let exponent = this.readBit();
        mantissa += (this.readBits(7) << 16);
        let sign = this.readBit();
        if(sign) {
            sign = -1;
        } else {
            sign = 1;
        }
        exponent += (this.readBits(7) << 1);
        exponent -= 127;

        return Math.pow(2, exponent) * (mantissa * 1.1920928955078125e-7 + 1) * sign;
    }

    /**
     * Writes a float to the stream
     * @param {Number} n
     */
    writeFloat(n) {
        let sign = (n < 0);
        let exponent = Math.floor(Math.log2(Math.abs(n)));
        let mantissa = Math.ceil(((Math.abs(n) / Math.pow(2, exponent)) - 1) / 1.1920928955078125e-7); // 1.1920928955078125e-7 = 2^-23
        exponent += 127;

        this.writeByte(mantissa & 0xff);
        this.writeByte((mantissa & 0xff00) >> 8);
        this.writeBit((exponent & 0x01) === 1);
        this.writeBits((mantissa & 0x7f0000) >> 16, 7);
        this.writeBit(sign);
        this.writeBits((exponent & 0xfe) >> 1, 7);
    }

    /**
     * Writes a BitStream to this BitStream
     * @param {BitStream} bs
     */
    writeBitStream(bs) {
        for(let i = 0; i < bs.bits(); i++) {
            this.writeBit(bs.readBit() === 1);
        }
    }

    /**
     * Reads compressed data from the stream
     * @param {Number} size The size of the data to read
     * @returns {BitStream}
     */
    readCompressed(size) {
        let currentByte = size - 1;
        let ret = new BitStream();

        while(currentByte > 0) {
            let b = this.readBit();

            if(b) {
                currentByte --;
            } else {

                for(let i = 0; i < size - currentByte - 1; i++) {
                    ret.writeByte(0);
                }
                for(let i = 0; i < currentByte + 1; i ++) {
                    ret.writeByte(this.readByte());
                }
                return ret;
            }
        }

        let b = this.readBit();

        if(b) {
            ret.writeByte(this.readBits(4) << 4 && 0xF0);
        } else {
            ret.writeByte(this.readByte());
        }
        for(let i = 0; i < size - 1; i++) {
            ret.writeByte(0);
        }
        return ret;
    }

    /**
     *
     * @param {Number} data The number to write
     * @param {Number} size The number of bytes to write it in
     */
    writeCompressed(data, size) {
        let currentByte = size - 1;
        let mask = [
            0xFF,
            0XFF00,
            0xFF0000,
            0xFF000000,
            0xFF00000000,
            0xFF0000000000,
            0xFF000000000000,
            0xFF00000000000000
        ];


        while(currentByte > 0) {
            let zero = (data & mask[currentByte]) === 0;
            this.writeBit(zero);
            if(!zero) {
                // Now we write all the bits from beginning to the current byte
                for(let i = 0; i < currentByte + 1; i ++) {
                    this.writeByte((data & mask[i]) >> i * 8);
                }
                return;
            }
            currentByte --;
        }

        let zero = (data & 0xF0) === 0;
        this.writeBit(zero);
        if(zero) {
            this.writeBits(data & 0xF0 >> 4, 4);
        } else {
            this.writeByte(data & 0xFF);
        }
    }

    /**
     * Reads a string from the stream
     * @param {Number} [size]
     * @returns {string}
     */
    readString(size) {
        if(size === undefined) size = 33;
        let text = "";

        for(let i = 0; i < size; i++) {
            text += String.fromCharCode(this.readByte());
        }
        return text;
    }

    /**
     *
     * @param {String} string
     * @param {Number} [size]
     */
    writeString(string, size) {
        if(size === undefined) {
            size = 33;
        }
        while(string.length < size) {
            string += '\0';
        }

        for(let i = 0; i < string.length; i++) {
            this.writeByte(string.charCodeAt(i));
        }
    }

    /**
     *
     * @param {Number} [size]
     * @returns {String}
     */
    readWString(size) {
        if(size === undefined) {
            size = 33;
        }
        let write = true;
        let text = "";
        let temp = this.readShort();
        write = temp !== 0;
        for(let i = 0; i < size - 1; i ++) {
            if(write) {
                temp = String.fromCharCode(temp);
                text += temp;
                temp = this.readShort();
                write = temp !== 0;
            } else {
                temp = this.readShort();
            }
        }
        return text;
    }

    /**
     *
     * @param {String} string
     * @param {Number} [size]
     */
    writeWString(string, size) {
        if(size === undefined) size = 33;
        while(string.length < size) {
            string += '\0';
        }

        for(let i = 0; i < size; i++) {
            this.writeByte(string.charCodeAt(i));
            this.writeByte(0);
        }
    }

    /**
     * Aligns the current reading bit to the next available byte
     */
    alignRead() {
        if(this._rBitPos !== 7) {
            this._rBitPos = 7;
            this._rBytePos ++;
        }
    }

    /**
     * Aligns the current writing bit to the next available byte
     */
    alignWrite() {
        if(this._wBitPos !== 7) {
            this._wBitPos = 7;
            this._wBytePos ++;
        }
    }

    /**
     * Adds a BitStream to the end of this BitStream
     * @param {BitStream} bs The BitStream to add on
     */
    concat(bs) {
        for(let i = 0; i < bs.length; i ++) {
            for(let j = 0; j < bs[i].length(); j ++) {
                this.writeByte(bs[i].readByte());
            }
        }
    }

    /**
     * Gets the binary string representation of this BitStream
     * @returns {String}
     */
    toBinaryString() {
        let output = "";
        let temp = [
            '0000',
            '0001',
            '0010',
            '0011',
            '0100',
            '0101',
            '0110',
            '0111',
            '1000',
            '1001',
            '1010',
            '1011',
            '1100',
            '1101',
            '1110',
            '1111'
        ];

        for(let i = 0; i < this._byteCount; i ++) {
            let byte = this.data.readUInt8(i);
            let partone = (byte & 0xF0) >> 4;
            let parttwo = byte & 0x0F;

            if(i === this._rBytePos) {
                for(let j = 7; j >= 0; j--) {
                    let bit = (byte & this._mask[j]) >> j;
                    if(j === this._rBitPos) {
                        output += " -> "
                    }
                    output += bit;
                }
                output += ' ';
            } else if(i === this._wBytePos) {
                for(let j = 7; j >= 0; j--) {
                    let bit = (byte & this._mask[j]) >> j;
                    if(j === this._wBitPos) {
                        output += " <- "
                    }
                    output += bit;
                }
                output += ' ';
            } else {
                output += temp[partone] + temp[parttwo] + ' ';
            }


        }
        return output;
    }

    /**
     * Returns the Hex representation of this BitStream
     */
    toHexString() {
        let output = "";
        let temp = [
            '0',
            '1',
            '2',
            '3',
            '4',
            '5',
            '6',
            '7',
            '8',
            '9',
            'A',
            'B',
            'C',
            'D',
            'E',
            'F'
        ];

        for(let i = 0; i < this._byteCount; i ++) {
            let byte = this.data.readUInt8(i);
            let partone = (byte & 0xF0) >> 4;
            let parttwo = byte & 0x0F;

            output += temp[partone] + temp[parttwo] + ' ';
        }
        return output;
    }
}

/**
 * Turns Unicode into a number
 * @param {String} string
 * @returns {Number}
 */
function ord (string) {
    //  discuss at: http://locutus.io/php/ord/
    // original by: Kevin van Zonneveld (http://kvz.io)
    // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
    // improved by: Brett Zamir (http://brett-zamir.me)
    //    input by: incidence
    //   example 1: ord('K')
    //   returns 1: 75
    //   example 2: ord('\uD800\uDC00'); // surrogate pair to create a single Unicode character
    //   returns 2: 65536
    let str = string + '';
    let code = str.charCodeAt(0);
    if (code >= 0xD800 && code <= 0xDBFF) {
        // High surrogate (could change last hex to 0xDB7F to treat
        // high private surrogates as single characters)
        let hi = code;
        if (str.length === 1) {
            // This is just a high surrogate with no following low surrogate,
            // so we return its value;
            return code
            // we could also throw an error as it is not a complete character,
            // but someone may want to know
        }
        let low = str.charCodeAt(1);
        return ((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000
    }
    if (code >= 0xDC00 && code <= 0xDFFF) {
        // Low surrogate
        // This is just a low surrogate with no preceding high surrogate,
        // so we return its value;
        return code;
        // we could also throw an error as it is not a complete character,
        // but someone may want to know
    }
    return code
}

module.exports = BitStream;