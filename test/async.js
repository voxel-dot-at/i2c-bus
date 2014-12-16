'use strict';

var assert = require('assert'),
  i2c = require('../'),
  i2c1;

var DS1621_ADDR = 0x48,
  CMD_ACCESS_CONFIG = 0xac,
  CMD_ACCESS_TL = 0xa2;

// Wait while non volatile memory busy
function waitForWrite(cb) {
  i2c1.readByte(DS1621_ADDR, CMD_ACCESS_CONFIG, function (err, config) {
    assert(!err, 'can\'t read config to determine memory status');
    if (config & 0x10) {
      return waitForWrite(cb);
    }
    cb();
  });
}

function finished() {
  i2c1.close(function () {
    console.log('ok - async');
  });
}

function i2cPlainReadWrite() {
  // Test i2cWrite & i2cRead
  // Change value of tl to 25 and verify that tl has been changed
  var cmdSetTL = new Buffer([CMD_ACCESS_TL, 25, 0]),
    cmdGetTL = new Buffer([CMD_ACCESS_TL]),
    tl = new Buffer(2);

  i2c1.i2cWrite(DS1621_ADDR, cmdSetTL.length, cmdSetTL, function (err, bytesWritten, buffer) {
    assert(!err, 'can\'t i2cWrite cmdSetTL');
    assert.strictEqual(bytesWritten, cmdSetTL.length, 'expected i2cWrite to write 3 bytes');

    waitForWrite(function () {
      i2c1.i2cWrite(DS1621_ADDR, cmdGetTL.length, cmdGetTL, function (err, bytesWritten, buffer) {
        assert(!err, 'can\'t i2cWrite cmdGetTL');
        assert.strictEqual(bytesWritten, cmdGetTL.length, 'expected i2cWrite to write 1 byte');

        i2c1.i2cRead(DS1621_ADDR, 2, tl, function (err, bytesRead, buffer) {
          assert(!err, 'can\'t i2cRead tl');
          assert.strictEqual(bytesRead, 2, 'expected i2cRead to read 2 bytes');
          assert.strictEqual(tl.readUInt16LE(0), 25, 'expected i2cRead to read value 25');

          finished();
        });
      });
    });
  });
}

function readWriteBytes() {
  // Test writeBytes & readBytes
  // Change value of tl to 22 and verify that tl has been changed
  var newtl = new Buffer(10);

  newtl.writeUInt16LE(22, 0);
  i2c1.writeBytes(DS1621_ADDR, CMD_ACCESS_TL, 2, newtl, function (err) {
    assert(!err, 'can\'t writeBytes to tl');
    waitForWrite(function () {
      i2c1.readBytes(DS1621_ADDR, CMD_ACCESS_TL, 2, newtl, function (err, bytesRead, buffer) {
        assert(!err, 'can\'t readBytes from tl');
        assert.strictEqual(bytesRead, 2, 'expected readBytes to read 2 bytes');
        assert.strictEqual(buffer.readUInt16LE(0), 22, 'expected readBytes to read value 22');

        i2cPlainReadWrite();
      });
    });
  });
}

function readWriteWord() {
  // Test writeWord & readWord
  // Change value of tl and verify that tl has been changed
  i2c1.readWord(DS1621_ADDR, CMD_ACCESS_TL, function (err, oldtl) {
    var newtl;

    assert(!err, 'can\'t readWord from tl');

    newtl = (oldtl === 24 ? 23 : 24);
    i2c1.writeWord(DS1621_ADDR, CMD_ACCESS_TL, newtl, function (err) {
      assert(!err, 'can\'t write word to tl');

      i2c1.readWord(DS1621_ADDR, CMD_ACCESS_TL, function (err, newtl2) {
        assert(!err, 'can\'t read new word from tl');
        assert.strictEqual(newtl, newtl2, 'unexpected');

        readWriteBytes();
      });
    });
  });
}

function sendReceiveByte(epectedConfig) {
  // Test sendByte & receiveByte
  // Read config and verify that it's epectedConfig
  i2c1.sendByte(DS1621_ADDR, CMD_ACCESS_CONFIG, function (err) {
    assert(!err, 'can\'t send byte to config');
    i2c1.receiveByte(DS1621_ADDR, function (err, config) {
      assert(!err, 'can\'t receive byte from config');
      assert.strictEqual(config, epectedConfig, '1st and 2nd config read differ');

      readWriteWord();
    });
  });
}

function readWriteByte() {
  // Test writeByte & readByte
  // Enter continuous mode and verify that continuous mode has been entered
  i2c1.writeByte(DS1621_ADDR, CMD_ACCESS_CONFIG, 0x0, function (err) {
    assert(!err, 'can\'t write byte to config');
    waitForWrite(function () {
      i2c1.readByte(DS1621_ADDR, CMD_ACCESS_CONFIG, function (err, config) {
        assert(!err, 'can\'t read byte from config');
        assert.strictEqual(config & 0x1, 0, 'continuous mode not eneterd');

        sendReceiveByte(config);
      });
    });
  });
}

i2c1 = i2c.open(1, function (err) {
  assert(!err, 'can\'t open i2c bus');
  readWriteByte();
});
