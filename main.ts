
/**
 * Joystick:bit transmitter for the Nezha diff-drive robot.
 * 
 * ============================================================================
 * CHANNEL & RADIO CONFIGURATION
 * ============================================================================
 * Each Micro:bit automatically derives a fixed channel from its machine ID
 * (serial number modulo 36). Channels are in base-36 ('0'-'9', 'A'-'Z')
 * and offset by +10 so frequency bands start at 10 (range: 10..45).
 * 
 * Radio group is always: 11
 * 
 * ----------------------------------------------------------------------------
 * RECEIVER / ROBOT SETUP CODE (Copy into robot program):
 * ----------------------------------------------------------------------------
 * Look at the character displayed on this transmitter's screen (e.g. 'A', '3'):
 * 
 *   radio.setGroup(11)
 *   radio.setFrequencyBand(channelFromCode("<DISPLAYED_CHAR>"))
 * 
 * Or directly as a one-liner in your robot's on-start block:
 *   radio.setGroup(11)
 *   radio.setFrequencyBand(parseInt("<DISPLAYED_CHAR>", 36) + 10)
 * 
 * Here is an example program to display all of the data the joystick sends over the radio:
 *
 *   radio.onReceivedValue(function (name, value) {
 *       serial.writeValue(name, value)
 *   })
 *   radio.setGroup(11)
 *   let channel = "J"
 *   radio.setFrequencyBand(parseInt(channel, 36) + 10)
 *   basic.forever(function () {
 *
 *   })
 * 
 * Channel mapping examples:
 *   '0' -> channel 10  |  '9' -> channel 19
 *   'A' -> channel 20  |  'B' -> channel 21
 *   'C' -> channel 22  |  'Z' -> channel 45
 * ============================================================================
 * 
 * Radio values sent every loop:
 *   x, y    raw rocker readings, 0..1023
 *   cx, cy  centred + dead-zoned axes, -512..+512 (0 when stick is idle)
 *   b       button code (1: A, 2: B, 3: P12/C, 4: P14/D, 5: P15/E, 6: P13/F, 0: None)
 */

const BASE36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

/**
 * Convert a base-36 channel character ('0'-'9', 'A'-'Z') back to its frequency band channel number.
 * Channels start at 10 (e.g. '0' -> 10, '9' -> 19, 'A' -> 20, 'Z' -> 45).
 */
function channelFromCode(code: string): number {
    let idx = BASE36.indexOf(code.toUpperCase())
    if (idx < 0) {
        return 10
    }
    return idx + 10
}

// ----------------------------------------------------------- axis maths
// Turn one raw rocker reading into a centred, dead-zoned -512..+512 value.
function scaleAxis (raw: number, centre: number) {
    d = raw - centre
    if (d >= 0) {
        span = RAW_MAX - centre
    } else {
        span = centre
    }
    if (span < 1) {
        span = 1
    }
    s = Math.constrain(d * OUT_MAX / span, 0 - OUT_MAX, OUT_MAX)
    if (s > DEAD_ZONE) {
        return Math.round((s - DEAD_ZONE) * OUT_MAX / (OUT_MAX - DEAD_ZONE))
    }
    if (s < 0 - DEAD_ZONE) {
        return Math.round((s + DEAD_ZONE) * OUT_MAX / (OUT_MAX - DEAD_ZONE))
    }
    return 0
}

// Average the resting rocker readings for CAL_MS into centreX / centreY.
// The stick must be untouched while the centre LED is lit.
function calibrateCentre () {
    led.plot(2, 2)
    centreX = joystickbit.getRockerValue(joystickbit.rockerType.X)
    centreY = joystickbit.getRockerValue(joystickbit.rockerType.Y)
    while (elapsed < CAL_MS) {
        centreX = CAL_ALPHA * joystickbit.getRockerValue(joystickbit.rockerType.X) + (1 - CAL_ALPHA) * centreX
        centreY = CAL_ALPHA * joystickbit.getRockerValue(joystickbit.rockerType.Y) + (1 - CAL_ALPHA) * centreY
        basic.pause(CAL_STEP_MS)
        elapsed += CAL_STEP_MS
    }
    basic.clearScreen()
}

// ---------------------------------------------------------------- state
let rawY = 0
let rawX = 0
let elapsed = 0
let centreY = 0
let centreX = 0
let s = 0
let span = 0
let d = 0

// micro:bit analog read full scale
let RAW_MAX = 1023
// cx / cy full scale
let OUT_MAX = 512
// cx / cy counts treated as "stick not touched"
let DEAD_ZONE = 7
// how long to average the resting stick (ms)
let CAL_MS = 1000
// sample period during calibration (ms)
let CAL_STEP_MS = 10
// EMA weight of each new sample
let CAL_ALPHA = 0.1

// Group is always 11
let group = 11

// Derive fixed base-36 channel from machine serial number (0..35 -> channel 10..45)
let deviceId = control.deviceSerialNumber()
let channelIndex = ((deviceId % 36) + 36) % 36
let channelCode = BASE36.charAt(channelIndex)
let channel = channelIndex + 10

// ------------------------------------------------------------- on start
joystickbit.initJoystickBit()
radio.setGroup(group)
radio.setFrequencyBand(channel)
calibrateCentre()
basic.showString(channelCode)

// ---------------------------------------------------------------- loop
basic.forever(function () {
    rawX = joystickbit.getRockerValue(joystickbit.rockerType.X)
    rawY = joystickbit.getRockerValue(joystickbit.rockerType.Y)
    radio.sendValue("x", rawX)
    radio.sendValue("y", rawY)
    radio.sendValue("cx", scaleAxis(rawX, centreX))
    radio.sendValue("cy", scaleAxis(rawY, centreY))
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
        radio.sendValue("b", 0)
    }
})

