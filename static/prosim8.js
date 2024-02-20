const serviceUuid = "00000001-710e-4a5b-8d75-3e5b444bc3cf";
const characteristicUuid = "00000003-710e-4a5b-8d75-3e5b444bc3cf"

let bleCharacteristic;
let values

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
}

function setupSlider(name, minValue, maxValue, diffAxis, startValue, step, callback) {
    $(`#${name}`).slider({
        orientation: 'vertical',
        range: 'min',
        min: minValue,
        max: maxValue,
        value: startValue,
        step: step,
        slide: function(event, ui) {
            if ($(this).slider("option", "step") == 1) {
                $(`#${name}Value`).html(ui.value);
            } else {
                $(`#${name}Value`).html(ui.value.toFixed(1));
            }
            if (callback) {
                callback(ui.value);
            }
        }
    });
    if (step == 1) {
        $(`#${name}Value`).html(startValue);
    } else {
        $(`#${name}Value`).html(startValue.toFixed(1));
    }

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
    await bleCharacteristic.writeValue(encoder.encode(command));
}

function addEventHandlerToSlider(name, eventFn) {
    $(`#${name}`).on('mouseup mouseout', function() {
        const value = $(`#${name}`).slider('option', 'value');
        //eventFn(value);
    });
}

const zeroPad = (num, decimals, places) => String(num.toFixed(decimals)).padStart(places, '0')

$(function() {
    // Document is ready to be manipulated

    const heartRateChanged = (value) => {
         // Normal sinus rythm pediatric. bpm, 3 digits 010 to 360
         sendCommand(`NSRP=${zeroPad(value, 0, 3)}`);
    }

    const respiratoryRateChanged = (value) => {
        // Set respiration rate. bpm, 3 digits 010 to 150
        sendCommand(`RESPRATE=${zeroPad(value, 0, 3)}`);
    }

    const heartSpo2Changed = (value) => {
        // Sets SpO2 saturation percentage. Unsigned 3 digits: 000 to 100.
        sendCommand(`SAT=${zeroPad(value, 0, 3)}`);
    }

    const tempChanged = (value) => {
        // Set the temparature. Degrees C, 3 digits w/dp: 30.0 to 42.0 [by 00.5]
        sendCommand(`TEMP=${zeroPad(value, 1, 3)}`);
    }

    setupSlider('sliderHeartRate',       10, 360, 20, 70, 1, heartRateChanged);
    setupSlider('sliderResipratoryRate', 10, 150, 10, 50, 1, respiratoryRateChanged);
    setupSlider('sliderHeartSpO2',       0,  100, 10, 90, 1, heartSpo2Changed);
    setupSlider('sliderBloodPressure1',  -10,  300, 30, 90, 1);
    setupSlider('sliderBloodPressure2',  -10,  300, 30, 90, 1);
    setupSlider('sliderTemp',            30, 42,  1,  37, 0.5, tempChanged);
});


// –––––––––––––––––––––––––––––––––––––  MODALS  –––––––––––––––––––––––––––––––––––––

function openModal() {
    var modal = document.getElementById("myModal");
    modal.style.display = "flex";
}

function closeModal() {
    var modal = document.getElementById("myModal");
    modal.style.display = "none";
}

// Close the modal if the user clicks outside of it
window.onclick = function(event) {
    var modal = document.getElementById("myModal");
    if (event.target == modal) {
        modal.style.display = "none";
    }
}   


function openModal(modalId, buttonContentId) {
    var modal = document.getElementById(modalId);
    modal.style.display = "flex";

    var closeModalButton = modal.querySelector('.close');
    closeModalButton.onclick = function () {
        closeModal(modalId);
    };

    // Attach event listeners for each option button in the modal
    var optionButtons = modal.querySelectorAll('.option-buttons button');
    optionButtons.forEach(function (button) {
        button.onclick = function () {
            var content = button.textContent;
            updateButtonContent(buttonContentId, content);
            closeModal(modalId);
            selectOption(button);
        };
    });
}

function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    modal.style.display = "none";
}

function updateButtonContent(buttonContentId, content) {
    var buttonContent = document.getElementById(buttonContentId);
    buttonContent.textContent = content;
}

function selectOption(button) {
    console.log('Button clicked:', button);
    // Rest of the code...
        // Remove the 'selected' class from all buttons in the modal
        var modalButtons = document.querySelectorAll('.button.box');
        modalButtons.forEach(function (btn) {
            btn.classList.remove('selected');
        });
    
        // Add the 'selected' class to the clicked button
        button.classList.add('selected');
}

// Live Mode Switch Code
$(".checkitem").click(function(){
    var item = $(".checkitem");
    if (item.hasClass("itemactive")){
      // It is activated. Deactivate it!
      item.removeClass("itemactive");
      //$(".customcheck").css("background-color", "var(--fhs-gray-gray-800)")
      $(".customcheck").removeClass("customcheckActive");
      $(".switchHolder").removeClass("switchHolderActive");
      $("input[name='switch']").prop("checked", false);
    } else {
      // It's deactivated. Activate it!
      item.addClass("itemactive");
      //$(".customcheck").css("background-color", "var(--success-800)")
      $(".customcheck").addClass("customcheckActive");
      $(".switchHolder").addClass("switchHolderActive");
      $("input[name='switch']").prop("checked", true);
    }
  });
