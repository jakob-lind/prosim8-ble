import serial

class Prosim8:
    def __init__(self, comport) -> None:
        try:
            self.ser = serial.Serial(comport, 115200, timeout=1, xonxoff=True)
            self.sendCommand('REMOTE')
        except serial.serialutil.SerialException:
            self.ser = None
        
    def sendCommand(self, cmd) -> str:
        if self.ser is not None:
            self.ser.write(f'{cmd}\r\n'.encode('ascii'))
            reply = self.ser.readline()
        else:
            reply = 'No valid comport'
        print(f'Prosim8: {cmd} -> {reply}')
        return reply
        
    def nsrp(self, value) -> str:
        ''' Normal sinus rythm pediatric. bpm, 3 digits 010 to 360'''
        pulseSetValue = f'NSRP={value:03d}'
        return self.sendCommand(pulseSetValue)
    
    def nsra(self, value) -> str:
        ''' Normal sinus rythm adult. bpm, 3 digits 010 to 360'''
        pulseSetValue = f'NSRA={value:03d}'
        return self.sendCommand(pulseSetValue)
    
    def respwave(self, waveform) -> str:
        '''Set respiration wave, Normal or Ventilated (NORM or VENT)'''
        if not waveform in ('NORM', 'VENT'):
            print(f'error: {waveform}')
            return ''
        pulseSetValue = 'RESPWAVE={waveform}'
        return self.sendCommand(pulseSetValue)
        
    def resprate(self, value) -> str:
        '''Set respiration rate. bpm, 3 digits 010 to 150'''
        pulseSetValue = f'RESPRATE={value:03d}'
        return self.sendCommand(pulseSetValue)
       
    def ibps(self, value, value2) -> str:
        '''Set an IBP channel to static pressure. Channel 1 or 2 followed by signed static pressure. 3 digits -010 to +300'''
        if value == 1:
            self.nibpp(value2, int(value2*0.8))
        else:
            self.nibpp(int(value2*1.2), value2)

        pulseSetValue = f'IBPS={value:01d},{value2:+04d}'
        return self.sendCommand(pulseSetValue)
    
    def nibpp(self, value, value2) -> str:
        '''Set the NIBP dynamic pressure. Systolic pressure: unsigned 3 digits: 000 to 400. Diastolic pressure: unsigned 3 digits: 000 to 400.'''
        pulseSetValue = f'NIBPP={value:03d},{value2:03d}'
        return self.sendCommand(pulseSetValue)

    
    def temp(self, value) -> str:
        '''Set the temparature. Degrees C, 3 digits w/dp: 30.0 to 42.0 [by 00.5]'''
        pulseSetValue = f'TEMP={value:04.1f}'
        return self.sendCommand(pulseSetValue)

    def sat(self, value) -> str:
        '''Sets SpO2 saturation percentage. Unsigned 3 digits: 000 to 100.'''
        pulseSetValue = f'SAT={value:03d}'
        return self.sendCommand(pulseSetValue)
        