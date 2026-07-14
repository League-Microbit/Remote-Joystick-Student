radio.onReceivedValue(function (name, value) {
    serial.writeValue("x", 0)
    if (name == "x") {
        jx = value
    }
})
let jx = 0
let channel = 5
let group = 1
basic.showIcon(IconNames.Sword)
basic.showNumber(channel)
basic.showIcon(IconNames.Sword)
basic.showNumber(group)
basic.showIcon(IconNames.Sword)
joystickbit.initJoystickBit()
radio.setFrequencyBand(channel)
radio.setGroup(group)
basic.forever(function () {
    radio.sendValue("x", joystickbit.getRockerValue(joystickbit.rockerType.X))
    radio.sendValue("y", joystickbit.getRockerValue(joystickbit.rockerType.Y))
    if (joystickbit.getButton(joystickbit.JoystickBitPin.P12)) {
        radio.sendValue("b", 3)
    } else if (joystickbit.getButton(joystickbit.JoystickBitPin.P14)) {
        radio.sendValue("b", 4)
    } else if (joystickbit.getButton(joystickbit.JoystickBitPin.P15)) {
        radio.sendValue("b", 5)
    } else if (joystickbit.getButton(joystickbit.JoystickBitPin.P13)) {
        radio.sendValue("b", 6)
    } else if (input.buttonIsPressed(Button.A)) {
        radio.sendValue("b", 1)
    } else if (input.buttonIsPressed(Button.B)) {
        radio.sendValue("b", 2)
    } else {
    	
    }
})
