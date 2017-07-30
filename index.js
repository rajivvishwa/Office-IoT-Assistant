const moment = require('moment');
var eventLog = require('./moment-mod');
const sensor = require('./devices/dht-sensor')();
const gpio = require('rpi-gpio');
const Raspi = require('raspi-io');
const five = require('johnny-five');
const board = new five.Board({
    io: new Raspi()
});

var RaspiCam = require("raspicam");

//Azure 

var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;
var connectionString = process.env.AzDeviceConnString;
var client = clientFromConnectionString(connectionString);


const PIN_RELAY1 = 'GPIO16';
const PIN_RELAY2 = 'GPIO20';
const PIN_RGBLED = 'GPIO21';
const PIN_DHT22 = '24';
const PIN_PIR = 'GPIO25';
const PIN_PHOTOR = 'GPIO17';
//const PIN_HYDRO = 'GPIO18';

board.on("ready", function () {

    //Azure Functions
    function printResultFor(op) {
        return function printResult(err, res) {
            if (err) console.log(op + ' error: ' + err.toString());
            if (res) console.log(op + ' status: ' + res.constructor.name);
        };
    }

    var connectCallback = function (err, deviceEventJSON) {
        if (err) {
            console.log('Could not connect: ' + err);
        } else {
            console.log('Client connected');
            var deviceEvent = JSON.parse(deviceEventJSON);
            var data = JSON.stringify({
                deviceId: 'OfficePiZero',
                ts: deviceEvent.ts,
                device: deviceEvent.device,
                msg: deviceEvent.msg,
                ts_raw: deviceEvent.ts_raw
            });
            var message = new Message(data);
            console.log("Sending message: " + message.getData());
            client.sendEvent(message, printResultFor('send'));
        }
    };

    //Johnny - Five Code
    var led = new five.Led(PIN_RGBLED);
    var relays = new five.Relays([PIN_RELAY1, PIN_RELAY2]);
    var motion = new five.Motion(PIN_PIR);
    var camera = new RaspiCam({
        mode: "photo",
        output: "./photo/image-" + Date.now() + ".jpg",
        encoding: "jpg",
        timeout: 0
    });

    // Light Sensor
    var photoresistor = new five.Sensor.Digital(PIN_PHOTOR);
    photoresistor.on("change", function () {
        if (this.value == 1) {
            //console.log(eventLog.momentFormat("Light", "Dark Room"));
            client.open(connectCallback("", eventLog.momentFormat("Light", "Dark Room")));
            relaysChange(0, "on");
        } else {
            //console.log(eventLog.momentFormat("Light", "Bright Room"));
            client.open(connectCallback("", eventLog.momentFormat("Light", "Bright Room")));
            relaysChange(0, "off");
        }
    });

    // Relay Control
    function relaysChange(rlyPin, state) {
        device = (rlyPin == 0 ? 'Light' : 'Fan');

        switch (state) {
            case "on":
                relays[rlyPin].on();
                //console.log(eventLog.momentFormat("Relay", "Turned On" + device));
                client.open(connectCallback("", eventLog.momentFormat("Relay", "Turned On")));
                break;
            case "off":
                relays[rlyPin].off();
                //console.log(eventLog.momentFormat("Relay", "Turned Off " + device));
                client.open(connectCallback("", eventLog.momentFormat("Relay", "Turned Off")));
                break;
        }
    }

    // Temperature and Humidity Sensors
    function getTempAndHumid() {
        sensorData = sensor.read();
        //console.log(eventLog.momentFormat("Temperature", sensor.data.temperature));
        //console.log(eventLog.momentFormat("Humidity", sensor.data.humidity));
        client.open(connectCallback("", eventLog.momentFormat("Temperature", sensor.data.temperature)));
        client.open(connectCallback("", eventLog.momentFormat("Humidity", sensor.data.humidity)));
}
setInterval(getTempAndHumid, 2000);

// Motion Sensor
motion.on("calibrated", function () {
    //console.log(eventLog.momentFormat("Motion", "Calibrating Sensor"));
    client.open(connectCallback("", eventLog.momentFormat("Motion", "Calibrating Sensor")));
});

motion.on("motionstart", function () {
    //console.log(eventLog.momentFormat("Motion", "Detect Start"));
    client.open(connectCallback("", eventLog.momentFormat("Motion", "Detect Start")));
    camera.start();
}); motion.on("change", function () {
    //console.log(eventLog.momentFormat("Motion", "Detect End"));
    client.open(connectCallback("", eventLog.momentFormat("Motion", "Detect End")));
});

// Camera Control
camera.on("start", function (err, timestamp) {
    //console.log(eventLog.momentFormat("Camera", "Starting Capture"));
    client.open(connectCallback("", eventLog.momentFormat("Camera", "Starting Capture")));
});

camera.on("read", function (err, filename) {

    if (!err) {
        //console.log(eventLog.momentFormat("Camera", "Image Snapped - " + camera.get("output")));
        client.open(connectCallback("", eventLog.momentFormat("Camera", "Image Snapped - " + camera.get("output"))));
    } else {
        console.log('Error taking photo!');
    }
    camera.stop();
});

camera.on("exit", function (timestamp) {
    //console.log(eventLog.momentFormat("Camera", "End Capture"));
    client.open(connectCallback("", eventLog.momentFormat("Camera", "End Capture")));
});

camera.start();
/*
    this.repl.inject({
        led_on: function () {
            led.on();
        },
        led_off: function () {
            led.off();
        },
        relay1: function () {
            relay1.toggle();
        },
        relay2: function () {
            relay2.toggle();
        }
    });
*/

// Graceful Exit
this.on("exit", function () {
    //console.log(eventLog.momentFormat("Device", "Exited!"));
    client.open(connectCallback("", eventLog.momentFormat("Device", "Exited")));
    camera.stop();
});
});
