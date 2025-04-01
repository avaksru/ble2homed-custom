const crypto = require("crypto");

class Parserbthome {
  constructor(buffer, device) {
    this.buffer = buffer;
    this.device = device;
  }

  parse() {
     if (this.buffer.length === 14) { // bthomev2
      let voltage = this.buffer.readInt16LE(12);
      return {
        temperature: this.buffer.readInt16LE(6) / 100,
        humidity: this.buffer.readUInt16LE(9) / 100,
        voltage: voltage > 1000 ? voltage / 1000 : voltage,
        battery: this.buffer.readUInt8(4),
        type: "BTHOMEv2 THB2 PVVX (No encryption)"
             }
      } else if (this.buffer.length === 11) {
      return {
        temperature: this.buffer.readInt16LE(6) / 100,
        humidity: this.buffer.readUInt16LE(9) / 100,
        battery: this.buffer.readUInt8(4),
        type: "BTHOMEv2 ATC PVVX (No encryption)"
             }  
    }
  }
}

module.exports = {
  Parserbthome
}
