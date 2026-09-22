# Device announcement — what this firmware puts on the wire

This board is the **student joystick remote**
(`League-Microbit/Remote-Joystick-Student`): a micro:bit V2 in an
ELECFREAKS joystick:bit carrier that drives a Nezha robot over radio.

It announces itself on **serial only**. Everything below is what the
firmware in [`../announce.ts`](../announce.ts) actually emits today.

---

## Serial (USB CDC) — the banner

Emitted once at boot, and again on every `HELLO` the host sends.

```
DEVICE:<role>:<common_name>:<device_name>:<serial>
DEVICE:JOYSTICK:joystick:gopiv:2175407711
```

This is the spec-mandated colon form, unchanged — it parses today with
robot-console's existing `parseBanner()` and needs no grammar change. The
only new thing in it is the `JOYSTICK` role token.

| Field | Value | Notes |
|---|---|---|
| `role` | `JOYSTICK` | New role token. Uppercase, by convention. |
| `common_name` | `joystick` | Matches robot-console's `FirmwareKind` string. |
| `device_name` | e.g. `gopiv` | `control.deviceName()` — CODAL's friendly name. Always 5 chars. |
| `serial` | e.g. `2175407711` | `FICR.DEVICEID[1]`, **decimal**, **unsigned**. |

### Two things the consumer side should know

**The serial is decimal.** `JOYSTICK` is not in robot-console's
`SERIAL_RADIX_BY_ROLE`, so it falls through to `DEFAULT_SERIAL_RADIX = 10`.
That is already the correct reading — this firmware emits decimal
deliberately, to match that default. Do **not** add a `JOYSTICK: 16` entry;
the hex serial is a legacy `RADIORELAY` quirk and is not repeated here.

**The serial is unsigned.** `control.deviceSerialNumber()` returns
`DEVICEID[1]` as a *signed* int32, so any board with the top bit set would
otherwise announce a negative number — roughly half of them, and real fleet
ids reach `4267970133`. The firmware reinterprets to unsigned before
printing, so `bannerNameMatchesSerial()` holds for every board, not just the
low half. That check is a free integrity test on this banner; it is worth
running.

---

## Radio — no banner, by design

**The joystick does not announce over the radio.** The radio carries the
joystick protocol and nothing else: the plain MakeCode radio values
`x`, `y`, `cx`, `cy` and `b` that `main.blocks` sends to the robot. A
consumer looking for a `DEVICE:` line, or any other identity line, over the
air will never see one.

Identity is a serial-transport concern here — a board says what it is on
the wire you plugged it into.

| Key | Value |
|---|---|
| `x`, `y` | raw rocker readings, 0..1023 |
| `cx`, `cy` | centred and dead-zoned axes, -512..+512, 0 when idle |
| `b` | button code while held, 0 otherwise |

Group is 11; the channel is shown as a single base-36 character on the
board's display and is adjustable from its setup menu.

---

## What is not here

- **No radio announcement of any kind**, as above.
- **The joystick carries no robot identity.** It is not a `devices` row of
  `kind: "robot"`; it drives one. robot-console's `wsMessages.ts` currently
  states a joystick "never gets identified as a device in the first place" —
  that is the assumption this firmware is asking to revisit.
- **No v6 line grammar.** The joystick does not speak `verb field* '#'id`
  on either transport.

## Status

The banner is spec-conformant and needs no agreement from anyone: it is the
existing colon form with a new role token, on the transport the spec already
uses for device identity. The consumer-side work is recognising `JOYSTICK`
as a device kind, not parsing anything new.
