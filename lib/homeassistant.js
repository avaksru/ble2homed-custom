const packageJSON = require("../package.json");
const mqtt = require("./mqttclient");
const config = require("./config");
const deviceTypes = {
  temp: {
    unit_of_measurement: "°C",
    device_class: "temperature"
  },
  temperature: {
    unit_of_measurement: "°C",
    device_class: "temperature"
  },
  hum: {
    unit_of_measurement: "%",
    device_class: "humidity"
  },
  humidity: {
    unit_of_measurement: "%",
    device_class: "humidity"
  },
  pressure: { // pa
    unit_of_measurement: "hPa",
    device_class: "pressure"
  },
  steps: {
    unit_of_measurement: "steps",
    icon: "mdi:walk"
  },
  heartRate: {
    unit_of_measurement: "bpm",
    icon: "mdi:heart-pulse"
  },
  weight: {
    unit_of_measurement: "kg",
    icon: "mdi:scale-bathroom"
  },
  battery: {
    unit_of_measurement: "%",
    device_class: "battery"
  },
  energy: {
    unit_of_measurement: "Wh",
    device_class: "energy"
  },
  illuminance: { // lx
    unit_of_measurement: "lx",
    device_class: "illuminance"
  },
  light: {
    device_class: "light"
  },
  moisture: { // %
    unit_of_measurement: "%",
    icon: "mdi:water-percent"
  },
  motion: {
    device_class: "motion",
    off_delay: 30
  },
  conductivity: { // µS/cm
    unit_of_measurement: "µS/cm",
    icon: "mdi:flower"
  },
  rssi: {
    unit_of_measurement: "dBm",
    device_class: "signal_strength"
  },
//  battery_voltage: {
//    entity_category: "diagnostic",
//    device_class: "voltage",
//    state_class: "measurement",
//    unit_of_measurement: "v"
//  },
  voltage: {
    entity_category: "diagnostic",
    device_class: "voltage",
    state_class: "measurement",
    unit_of_measurement: "v"
  },
  digital: {},
  analog: {},
  level: {},
  alert: {},
  last: {},
  data: {}
}
const binaryDevices = ["digital", "motion", "light"];

let discoverySend = {};
let devicesExposes = {};
let devicesOptions = {};


function joinKey(arr) {
  return arr.join("_").replace("/", "");
}

exports.configDiscovery = function (data, device, peripheral, serviceId) {
  let id = peripheral.address;
  let uuid = peripheral.uuid;
  for (let dataKey in data) {
    if (deviceTypes[dataKey] !== undefined && !discoverySend[id + serviceId + dataKey]) {
      let component, valueTemplate;
      if (binaryDevices.includes(dataKey)) {
        component = "binary_sensor";
        valueTemplate = "{{ \"ON\" if float(value_json." + dataKey + ")!=0 else \"OFF\" }}";
      } else {
        component = "sensor";
        valueTemplate = "{{ value_json." + dataKey + " }}";
      }
      let configTopic = `homeassistant/${component}/${uuid}/${serviceId}_${dataKey}/config`
      let payload = {
        ...deviceTypes[dataKey],
        "state_topic": device.json_state_topic,
        "value_template": valueTemplate,
        "json_attributes_topic": device.json_state_topic,
        "name": (device.name_is_mac ? uuid : device.name) + " " + joinKey([serviceId, dataKey]),
        "unique_id": joinKey([config.mqtt_prefix, uuid, serviceId, dataKey]),
        "device": {
          "identifiers": [id],
          "name": (device.name_is_mac ? id : device.name),
          "sw_version": packageJSON.name + " " + packageJSON.version,
          "model": (device.model ? device.model : "-"),
          "manufacturer": (device.manufacturer ? device.manufacturer : "-")
        },
        "availability": [
          {
            "topic": device.presence_topic,
            "payload_available": '{"status":"online"}',
            "payload_not_available": '{"status":"offline"}'
          },
          {
            "topic": config.mqtt_prefix + "/state"
          }
        ]
      };
      if (device.name_is_mac) {
        if (peripheral.advertisement.localName) {
          payload.name = peripheral.advertisement.localName + " " + joinKey([serviceId, dataKey]);
          payload.device.name = peripheral.advertisement.localName;
        }
      }
      if (config.mqtt_options.clientId) {
        payload.unique_id += "_" + config.mqtt_options.clientId;
        payload.name += "_" + config.mqtt_options.clientId;
        payload.device.identifiers[0] += "_" + config.mqtt_options.clientId;
      }
      if (data["productName"]) {
        payload.device.model = data["productName"];
        payload.device.manufacturer = "Xiaomi";
      }

      mqtt.send(configTopic, JSON.stringify(payload), { retain: true });
      discoverySend[id + serviceId + dataKey] = true;
    }
  }
}



exports.homedDiscovery = function (data, device, peripheral, serviceId) {
  let id = peripheral.address;
  let uuid = peripheral.uuid;

  let deviceKey = id //+ serviceId;

  let configTopic = config.mqtt_prefix + `/command/custom`
  let payload = {
    "action": "updateDevice",
    "device": id,
    "data": {
      "active": true,
      "cloud": false,
      "discovery": false,
      "id": id,
      "name": (device.name_is_mac ? id : device.name),
      "note": "",
      "real": true,
      "exposes": [],  // Initialize exposes array
      "options": {}   // Initialize options object

    }
  };

  if ((config.homed_cloud)) {
    payload.data.cloud = true;
    }
  if ((config.homed_discovery)) {
      payload.data.discovery = true;
    }

  if (!devicesExposes[deviceKey]) {
    devicesExposes[deviceKey] = [];
  }
  if (!devicesOptions[deviceKey]) {
    devicesOptions[deviceKey] = {};
  }


  for (let dataKey in data) {
    if (deviceTypes[dataKey] !== undefined && !devicesExposes[deviceKey].includes(dataKey) && !devicesExposes[deviceKey].includes("switch_" + dataKey)) {

     devicesExposes[deviceKey].push(dataKey);

      devicesOptions[deviceKey][dataKey] = {
        "class": deviceTypes[dataKey]["device_class"],
        "round": 1,
        "state": "measurement",
        "type": "sensor",
        "unit": deviceTypes[dataKey]["unit_of_measurement"]
      };

      payload.data.exposes = devicesExposes[deviceKey];
      payload.data.options = devicesOptions[deviceKey];
      mqtt.send(configTopic, JSON.stringify(payload), { retain: true });
    }
  }


}

mqtt.client.on("close", function () {
  discoverySend = {};
})
