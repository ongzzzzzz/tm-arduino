String val;     // Data received from serial port
int ledPin = 11;  // Arduino built-in LED
bool ledState = false;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  if (Serial.available()) {
    // If data is available to read,
    val = Serial.readStringUntil('\n');
    val.trim();
    Serial.println(val);
  }
  if (val == "Class 1"){
    ledState = 1;
  }
  else if (val == "Class 2"){
    ledState = 1;
  }
  digitalWrite(ledPin, ledState);
}