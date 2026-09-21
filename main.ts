/**
 * runningTime() of the last menu interaction
 * 
 * ------------------------------------------------------------- display
 */
/**
 * --------------------------------------------------------------- radio
 */
/**
 * ----------------------------------------------------------- axis maths
 */
/**
 * Joystick:bit transmitter for the Nezha diff-drive robot.
 * 
 * Paste this into a MakeCode micro:bit project that has the ELECFREAKS
 * 
 * `joystickbit` extension added.  Needs a micro:bit **V2** — the setup
 * 
 * menu is driven by the logo touch sensor, which V1 does not have.
 * 
 * Radio values sent every loop:
 * 
 * x, y    raw rocker readings, 0..1023, exactly as before
 * 
 * cx, cy  centred + dead-zoned axes, -512..+512, 0 when the stick is idle
 * 
 * b       button code, only while a button is held (see below)
 * 
 * Setup menu: tap the logo to cycle NORMAL -> CHANNEL -> GROUP -> NORMAL.
 * 
 * In CHANNEL / GROUP, A steps up and B steps down; the menu drops back to
 * 
 * NORMAL after 3 s with no input, or on the next logo tap.
 * 
 * LED bar display: a value of n lights n LEDs, left to right, wrapping
 * 
 * from row r (values 1..5) onto row r+1 (values 6..10).  Channel lives on
 * 
 * the top two rows, group on the bottom two.  NORMAL shows both at once;
 * 
 * the setup screens show only the bar being edited.
 */
/**
 * ---------------------------------------------------------------- tuning
 */
/**
 * resting rocker readings, measured at boot
 */
// Turn one raw rocker reading into a centred, dead-zoned -512..+512 value.
// 
// Two stretches, in order:
// 1. subtract the measured centre, then scale each half of the *raw*
// travel to full scale independently — the centre is rarely at 512,
// so the two halves have different spans and need different gains.
// 2. blank the +/- DEAD_ZONE band around zero, then stretch each
// remaining tail back out so it still reaches full scale.
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
function applyGroup (value: number) {
    w = Math.constrain(value, GROUP_MIN, GROUP_MAX)
    if (w != group) {
        group = w
        radio.setGroup(group)
    }
    showGroupBar()
    lastInput = input.runningTime()
}
function showGroupBar () {
    basic.clearScreen()
    drawBar(group, 3)
}
// A / B only edit the menu.  In NORMAL they are left alone so the forever
// loop can keep reporting them as button codes 1 and 2.
input.onButtonPressed(Button.A, function () {
    if (mode == MODE_CHANNEL) {
        applyChannel(channel - 1)
    } else if (mode == MODE_GROUP) {
        applyGroup(group - 1)
    }
})
// Clamp, store and apply a new channel.
// 
// setFrequencyBand() and setGroup() are re-asserted together: whether a
// band change disturbs the group is UNVERIFIED here (it would take a
// two-board bench check to settle), and re-sending the group costs
// nothing, so do it rather than depend on the answer.
function applyChannel (value: number) {
    v = Math.constrain(value, CHANNEL_MIN, CHANNEL_MAX)
    if (v != channel) {
        channel = v
        radio.setFrequencyBand(channel)
        radio.setGroup(group)
    }
    showChannelBar()
    lastInput = input.runningTime()
}
function showNormal () {
    basic.clearScreen()
    drawBar(channel, 0)
    drawBar(group, 3)
}
function showChannelBar () {
    basic.clearScreen()
    drawBar(channel, 0)
}
input.onButtonPressed(Button.B, function () {
    if (mode == MODE_CHANNEL) {
        applyChannel(channel + 1)
    } else if (mode == MODE_GROUP) {
        applyGroup(group + 1)
    }
})
// -------------------------------------------------------------- inputs
input.onLogoEvent(TouchButtonEvent.Pressed, function () {
    if (mode == MODE_NORMAL) {
        mode = MODE_CHANNEL
        basic.showString("C")
        showChannelBar()
    } else if (mode == MODE_CHANNEL) {
        mode = MODE_GROUP
        basic.showString("G")
        showGroupBar()
    } else {
        mode = MODE_NORMAL
        showNormal()
    }
    lastInput = input.runningTime()
})
// Light `value` LEDs across two rows, starting at `topRow`.
// Values 1..5 fill topRow left-to-right, 6..10 wrap onto topRow + 1.
function drawBar (value: number, topRow: number) {
    for (let i = 0; i <= 9; i++) {
        col = i % 5
        row = topRow + Math.idiv(i, 5)
        if (i < value) {
            led.plot(col, row)
        } else {
            led.unplot(col, row)
        }
    }
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
let rawY = 0
let rawX = 0
let elapsed = 0
let centreY = 0
let centreX = 0
let row = 0
let col = 0
let v = 0
let lastInput = 0
let w = 0
let s = 0
let span = 0
let d = 0
let MODE_NORMAL = 0
let mode = 0
let MODE_GROUP = 0
let MODE_CHANNEL = 0
let GROUP_MAX = 0
let GROUP_MIN = 0
let CHANNEL_MAX = 0
let CHANNEL_MIN = 0
let CAL_ALPHA = 0
let CAL_STEP_MS = 0
let CAL_MS = 0
let DEAD_ZONE = 0
let OUT_MAX = 0
let RAW_MAX = 0
let group = 0
let channel = 0
// ---------------------------------------------------------------- state
channel = 1
group = 1
// micro:bit analog read full scale
RAW_MAX = 1023
// cx / cy full scale
OUT_MAX = 512
// cx / cy counts treated as "stick not touched"
DEAD_ZONE = 7
// how long to average the resting stick
CAL_MS = 1000
// sample period during calibration
CAL_STEP_MS = 10
// EMA weight of each new sample
CAL_ALPHA = 0.1
CHANNEL_MIN = 1
CHANNEL_MAX = 10
GROUP_MIN = 0
GROUP_MAX = 10
// idle time before the setup menu gives up
let MENU_TIMEOUT_MS = 3000
MODE_CHANNEL = 1
MODE_GROUP = 2
mode = MODE_NORMAL
// ------------------------------------------------------------- on start
basic.showIcon(IconNames.Sword)
basic.showNumber(channel)
basic.showIcon(IconNames.Sword)
basic.showNumber(group)
basic.showIcon(IconNames.Sword)
joystickbit.initJoystickBit()
radio.setFrequencyBand(channel)
radio.setGroup(group)
calibrateCentre()
showNormal()
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
    } else if (mode == MODE_NORMAL && input.buttonIsPressed(Button.A)) {
        radio.sendValue("b", 1)
    } else if (mode == MODE_NORMAL && input.buttonIsPressed(Button.B)) {
        radio.sendValue("b", 2)
    } else {
        radio.sendValue("b", 0)
    }
    if (mode != MODE_NORMAL && input.runningTime() - lastInput > MENU_TIMEOUT_MS) {
        mode = MODE_NORMAL
        showNormal()
        basic.pause(100)
    }
})
