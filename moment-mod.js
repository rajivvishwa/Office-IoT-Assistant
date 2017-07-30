var moment = require('moment');
var device, msg;
var exports = module.exports = {};

exports.momentFormat = function (device, msg) {
    eventLog = moment().format('YYYY/MM/D hh:mm') + ": " + device + ": " + msg;
    azEvent = JSON.stringify({
        ts: moment().format('YYYY/MM/D hh:mm'),
        device: device,
        msg: msg,
        ts_raw: Date.now()
    });
    return (azEvent);
};

// var deviceEventJSON = exports.momentFormat("Light", "Dark Room");
// var deviceEvent = JSON.parse(deviceEventJSON);
// console.log(deviceEventJSON);
// console.log(deviceEvent.ts);
