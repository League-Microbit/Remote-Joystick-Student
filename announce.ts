/**
 * Device announcement — the "hello banner" that lets robot-console
 * recognise this board as a joystick when it is plugged in over USB.
 *
 * Wire format (the colon form, which the spec mandates for every device
 * class — League-Robotics/radio-robot-lib wiki, protocol §2.4):
 *
 *     DEVICE:<role>:<common_name>:<device_name>:<serial>
 *     DEVICE:JOYSTICK:joystick:gopiv:2175407711
 *
 * Sent once at boot on the USB serial line, and again whenever the host
 * sends `HELLO`.
 *
 * SERIAL ONLY. Nothing here touches the radio. The radio carries the
 * joystick protocol and nothing else — the x / y / cx / cy / b values
 * main.blocks sends — and a board is identified over the wire you
 * plugged it into (robot-console docs/DEVICE_LINKING.md: "the firmware's
 * DEVICE: announcement, read over the serial port").
 *
 * ---------------------------------------------------------------------
 * Two traps live in the last two fields. Both are silent if you get them
 * wrong — the banner still parses, it just describes the wrong board.
 *
 * 1. SERIAL IS DECIMAL, AND UNSIGNED.
 *
 *    robot-console picks the serial's radix by role token, explicitly
 *    (packages/protocol/src/banner.ts, SERIAL_RADIX_BY_ROLE). JOYSTICK
 *    is not in that table, so it falls to DEFAULT_SERIAL_RADIX = 10 —
 *    decimal. Do NOT copy the relay firmware's hex (`toHex8`) here: that
 *    is a legacy RADIORELAY quirk the table special-cases, and a hex
 *    serial read as decimal is still a valid-looking number, so nothing
 *    would report an error.
 *
 *    control.deviceSerialNumber() returns FICR.DEVICEID[1] as a SIGNED
 *    int32 (see core/control.cpp), so every board whose id has the top
 *    bit set — about half of them — would otherwise announce a negative
 *    serial. Real fleet ids hit this: 4267970133 is a logged relay id,
 *    well above 2^31. Reinterpret as unsigned before printing.
 *
 * 2. THE NAME MUST AGREE WITH THE SERIAL.
 *
 *    The five-letter name is a base-5 encoding of that same register, so
 *    a well-formed banner's two fields always agree — robot-console
 *    checks exactly that, for free, in bannerNameMatchesSerial(). Taking
 *    the name from control.deviceName() (CODAL's microbit_friendly_name,
 *    the same encoding) keeps them consistent. Do not substitute a
 *    nickname or a channel letter here.
 * ---------------------------------------------------------------------
 *
 * This file carries no //% block annotations on purpose. It runs itself
 * at boot (bottom of the file) and there is nothing for a student to
 * call, so it stays out of the blocks toolbox. Keeping it in its own
 * file also keeps it clear of main.ts, which MakeCode REGENERATES from
 * main.blocks — anything added there is lost the next time the project
 * is opened in the blocks editor.
 */
namespace announce {

    /** Role token — the device-type field. Uppercase, by convention. */
    const ROLE = "JOYSTICK"

    /** Human-oriented device class. Matches robot-console's
     * FirmwareKind string "joystick" (packages/host/src/wsMessages.ts),
     * the way the relay's "relay" matches its own kind. */
    const COMMON_NAME = "joystick"

    let _line = ""

    /**
     * Print a signed 32-bit value as its unsigned decimal string.
     *
     * The add is written out rather than using `n >>> 0` because the
     * result has to survive as a *number* here, and 2^32-1 is past what
     * an int32 holds; the explicit form leaves no doubt which width the
     * value ends up in. Trap 1 above has the full reasoning.
     */
    function unsignedDecimal(n: number): string {
        if (n < 0) {
            return "" + (n + 4294967296)
        }
        return "" + n
    }

    /** Build the banner and send it. */
    export function init(): void {
        _line = "DEVICE:" + ROLE + ":" + COMMON_NAME + ":"
            + control.deviceName() + ":"
            + unsignedDecimal(control.deviceSerialNumber())
        serial.writeLine(_line)
    }

    /** Re-emit the banner. */
    export function send(): void {
        if (_line != "") {
            serial.writeLine(_line)
        }
    }

    /**
     * Answer a HELLO. Returns true if the line was HELLO, so a program
     * with its own serial handler can call this at the top and return
     * early instead of duplicating the check.
     */
    export function handleHello(line: string): boolean {
        if (line == "HELLO") {
            send()
            return true
        }
        return false
    }

    /**
     * Register a serial handler that answers HELLO and nothing else.
     *
     * Safe here because main.blocks registers no serial handler of its
     * own — the joystick talks over radio. If one is ever added, drop
     * this call and put handleHello() at the top of that handler
     * instead; MakeCode keeps only the last onDataReceived registration.
     */
    export function listenForHello(): void {
        serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
            handleHello(serial.readUntil(serial.delimiters(Delimiters.NewLine)))
        })
    }
}

// Announce at boot. This file is listed before main.ts in pxt.json so the
// banner goes out immediately, rather than behind the several seconds of
// showIcon/showNumber and centre calibration that main.blocks runs first.
announce.init()
announce.listenForHello()
