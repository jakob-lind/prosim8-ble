#!/usr/bin/python3

"""Copyright (c) 2019, Douglas Otwell

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

import dbus

from ble_gatt_server.advertisement import Advertisement
from ble_gatt_server.service import Application, Service, Characteristic, Descriptor
from prosim8.api import Prosim8

COMPORT = "/dev/ttyAC0"

class ProSimAdvertisement(Advertisement):
    def __init__(self, index):
        Advertisement.__init__(self, index, "peripheral")
        self.add_local_name("ProSim 8")
        self.include_tx_power = True

class ProSimService(Service):
    PROSIM_SVC_UUID = "00000001-710e-4a5b-8d75-3e5b444bc3cf"

    def __init__(self, index):
        Service.__init__(self, index, self.PROSIM_SVC_UUID, True)
        self.add_characteristic(ControlCharacteristic(self))
        self.prosim8 = Prosim8(COMPORT)

    def handle_command(self, command):
        print(f'Sending command "{command}"')
        self.prosim8.sendCommand(command)

class ControlCharacteristic(Characteristic):
    CTL_CHARACTERISTIC_UUID = "00000003-710e-4a5b-8d75-3e5b444bc3cf"

    def __init__(self, service):
        Characteristic.__init__(
                self, self.CTL_CHARACTERISTIC_UUID,
                ["read", "write"], service)
        self.add_descriptor(CtlDescriptor(self))

    def WriteValue(self, value, options):
        self.service.handle_command(dbus.ByteArray(value).decode('ascii'))

    def ReadValue(self, options):
        return "Not implemented"

class CtlDescriptor(Descriptor):
    CTL_DESCRIPTOR_UUID = "2901"
    CTL_DESCRIPTOR_VALUE = "Command Line"

    def __init__(self, characteristic):
        Descriptor.__init__(
                self, self.CTL_DESCRIPTOR_UUID,
                ["read"],
                characteristic)

    def ReadValue(self, options):
        value = []
        desc = self.CTL_DESCRIPTOR_VALUE

        for c in desc:
            value.append(dbus.Byte(c.encode()))

        return value

app = Application()
app.add_service(ProSimService(0))
app.register()

adv = ProSimAdvertisement(0)
adv.register()

try:
    app.run()
except KeyboardInterrupt:
    app.quit()
