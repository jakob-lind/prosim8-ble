const serviceUuid = "00000001-710e-4a5b-8d75-3e5b444bc3cf";
const characteristicUuid = "00000003-710e-4a5b-8d75-3e5b444bc3cf";
const trendInterval = 1000;

let bleCharacteristic;
let trendTimer;
let trendActive;
let sourceState = { };
let targetState = { };

const zeroPad = (num, decimals, places) => String(num.toFixed(decimals)).padStart(places, '0')

const stateHandlers = {
    sliderHeartRate: async (value) => {
        // Normal sinus rythm pediatric. bpm, 3 digits 010 to 360
        await sendCommand(`NSRP=${zeroPad(value, 0, 3)}`);
    },
    sliderRespiratoryRate: async (value) => {
        // Set respiration rate. bpm, 3 digits 010 to 150
        await sendCommand(`RESPRATE=${zeroPad(value, 0, 3)}`);
    },
    sliderHeartSpO2: async (value) => {
        // Sets SpO2 saturation percentage. Unsigned 3 digits: 000 to 100
        await sendCommand(`SAT=${zeroPad(value, 0, 3)}`);
    },
    sliderBloodPressure1: async (value) => {
        const lo = Math.round(value * 0.8);
        // Set the NIBP dynamic pressure. Systolic pressure: unsigned 3 digits: 000 to 400. Diastolic pressure: unsigned 3 digits: 000 to 400
        await sendCommand(`NIBPP=${zeroPad(value, 0, 3)},${zeroPad(lo, 0, 3)}`);
        // Set an IBP channel to static pressure. Channel 1 or 2 followed by signed static pressure. 3 digits -010 to +300
        await sendCommand(`IBPS=1,+${zeroPad(value, 0, 3)}`);

    },
    sliderBloodPressure2: async (value) => {
        const hi = Math.round(value * 1.2);
        // Set the NIBP dynamic pressure. Systolic pressure: unsigned 3 digits: 000 to 400. Diastolic pressure: unsigned 3 digits: 000 to 400
        await sendCommand(`NIBPP=${zeroPad(hi, 0, 3)},${zeroPad(value, 0, 3)}`);
        // Set an IBP channel to static pressure. Channel 1 or 2 followed by signed static pressure. 3 digits -010 to +300
        await sendCommand(`IBPS=2,+${zeroPad(value, 0, 3)}`);

    },
    sliderTemp: async (value) => {
        // Set the temparature. Degrees C, 3 digits w/dp: 30.0 to 42.0 [by 00.5]
        await sendCommand(`TEMP=${zeroPad(value, 1, 3)}`);
    }
}

async function connectBle() {
    const options = {
        filters: [ 
            { namePrefix: 'ProSim' }
        ],
        optionalServices: [ serviceUuid ]
    };
    const device = await navigator.bluetooth.requestDevice(options);
    await device.gatt.connect();
    const service = await device.gatt.getPrimaryService(serviceUuid);
    bleCharacteristic = await service.getCharacteristic(characteristicUuid);
    console.log(`Connected to ${device.name}`);

    targetState = sourceState;
    activateState();
}

async function activateState() {
    for (const sliderKey in targetState) {
        if (sliderKey in stateHandlers) {
            await stateHandlers[sliderKey](targetState[sliderKey]);
        }
    }
    sourceState = { ...targetState };
    targetState = { };

    $('#activateButton').css('display', 'none');
    $('#trendButton').css('display', 'none');

    if (bleCharacteristic) {
        for (sliderKey in sourceState) {
            $(`#${sliderKey}`).slider('enable');
        }
    }
}

function abortTrend() {
    $('#activateButton').css('display', 'none');
    $('#trendButton').css('display', 'none');
    $('#trendTimer').css('display', 'none');

    clearTimeout(trendTimer);
    trendActive = false;

    for (const sliderKey in sourceState) {
        targetState[sliderKey] = $(`#${sliderKey}`).slider('value');
        $(`#${sliderKey}`).slider('enable');
    }
    activateState();
}

function openDialog(id) {
    $(`#${id}`).css('visibility', 'visible');
}

function closeDialog(id) {
    $(`#${id}`).css('visibility', 'hidden');
}

async function trendState(time) {
    trendDuration = time;
    const startTime = new Date().getTime();

    trendActive = true;
    for (sliderKey in sourceState) {
        $(`#${sliderKey}`).slider('value', sourceState[sliderKey]);
        $(`#${sliderKey}`).slider('disable');
    }

    const refreshTime = () => {
        const time = (startTime + trendDuration) - new Date().getTime();
        const seconds = Math.floor((time / 1000) % 60);
        const minutes = Math.floor((time / (1000 * 60)) % 60);
        const hours = Math.floor((time / (1000 * 60 * 60)) % 24);
        $('#trendTimerText').html(`${hours}:${zeroPad(minutes, 0, 2)}:${zeroPad(seconds, 0, 2)}`);
    }
    refreshTime();

    $('#activateButton').css('display', 'none');
    $('#trendButton').css('display', 'none');
    $('#trendTimer').css('display', 'block');

    if (trendTimer) {
        clearInterval(trendTimer);
        trendActive = false;
    }

    trendTimer = setInterval(() => {
        const elapsedTime = new Date().getTime() - startTime;
        const relTime = elapsedTime / trendDuration;
        if (relTime >= 1) {
            for (sliderKey in targetState) {
                $(`#${sliderKey}`).slider('value', targetState[sliderKey]);
                $(`#${sliderKey}`).slider('enable');
            }
            $('#trendTimer').css('display', 'none');
            clearInterval(trendTimer);
            trendActive = false;
        } else {
            for (sliderKey in targetState) {
                const sourceValue = sourceState[sliderKey];
                const targetValue = targetState[sliderKey];
                const value = ((1 - relTime) * sourceValue) + (relTime * targetValue);
                $(`#${sliderKey}`).slider('value', value);
                stateHandlers[sliderKey](value);
                refreshTime();
            }
        }
    }, trendInterval);
}

function updateTargetState() {
    $('#activateButton').css('display', 'flex');
    $('#trendButton').css('display', 'flex');
}

function setupSlider(name, minValue, maxValue, diffAxis, startValue, step = 1) {
    sourceState[name] = startValue;

    const refreshValue = (value) => {
        if (step == 1) {
            $(`#${name}Value`).html(value);
        } else {
            $(`#${name}Value`).html(value.toFixed(1));
        }
    }

    $(`#${name}`).slider({
        orientation: 'vertical',
        range: 'min',
        min: minValue,
        max: maxValue,
        value: startValue,
        step: step,
        disabled: true,
        change: (event, ui) => {
            refreshValue(ui.value);
            if (!trendActive) {
                targetState[name] = ui.value;
                updateTargetState();
            }
        }
    });
    refreshValue(startValue);

    // Add the y-axis 
    $(`#${name}Axis`).append(`<div class="max-value">${maxValue} –</div>`);
    for (let yval = maxValue - diffAxis; yval >= minValue; yval -= diffAxis ) {
        $(`#${name}Axis`).append(`<div class="min-value">${yval.toFixed(0)} –</div>`);
    }
}

async function sendCommand(command) {
    if (!bleCharacteristic) {
        console.error("Not connected");
        return;
    }
    const encoder = new TextEncoder();
    try {
        await bleCharacteristic.writeValue(encoder.encode(command));
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    catch { }
}


$(function() {
    // Document is ready to be manipulated

    setupSlider('sliderHeartRate',       10, 240, 20, 70);
    setupSlider('sliderRespiratoryRate', 10, 150, 10, 50);
    setupSlider('sliderHeartSpO2',       0,  100, 10, 90);
    setupSlider('sliderBloodPressure1',  0,  300, 30, 90);
    setupSlider('sliderBloodPressure2',  0,  300, 30, 90);
    setupSlider('sliderTemp',            30, 42,  1,  37);

    targetState = sourceState;
    activateState();

    openDialog('trendDialog');
});
