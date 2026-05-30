#include "DryoutPredictor.h"
#include "Config.h"

DryoutPredictor::DryoutPredictor()
  : _bias(DRYOUT_BIAS_DEFAULT)
  , _w_soil(DRYOUT_W_SOIL_DEFAULT)
  , _w_temp(DRYOUT_W_TEMP_DEFAULT)
  , _w_humidity(DRYOUT_W_HUM_DEFAULT)
  , _w_rain(DRYOUT_W_RAIN_DEFAULT)
  , _w_time(DRYOUT_W_TIME_DEFAULT)
  , _w_last(DRYOUT_W_LAST_DEFAULT)
  , _lr(DRYOUT_LR_DEFAULT)
{}

float DryoutPredictor::dot(float soil, float temp, float humidity,
                           float rain, float time, float last) const {
  return _bias
    + _w_soil  * soil
    + _w_temp  * temp
    + _w_humidity * humidity
    + _w_rain  * rain
    + _w_time  * time
    + _w_last  * last;
}

float DryoutPredictor::predict(float soilMoisture, float temp, float humidity,
                                float rainIntensity, float timeOfDay,
                                float lastWateringDuration) {
  float hours = dot(soilMoisture, temp, humidity, rainIntensity, timeOfDay, lastWateringDuration);
  return constrain(hours, DRYOUT_MIN_HOURS, DRYOUT_MAX_HOURS);
}

void DryoutPredictor::update(float soilMoisture, float temp, float humidity,
                              float rainIntensity, float timeOfDay,
                              float lastWateringDuration, float actualHours) {
  float pred = predict(soilMoisture, temp, humidity, rainIntensity, timeOfDay, lastWateringDuration);
  float error = actualHours - pred;

  _bias       += _lr * error;
  _w_soil     += _lr * error * soilMoisture;
  _w_temp     += _lr * error * temp;
  _w_humidity += _lr * error * humidity;
  _w_rain     += _lr * error * rainIntensity;
  _w_time     += _lr * error * timeOfDay;
  _w_last     += _lr * error * lastWateringDuration;
}

float DryoutPredictor::getWeight(uint8_t i) const {
  switch (i) {
    case 0: return _w_soil;
    case 1: return _w_temp;
    case 2: return _w_humidity;
    case 3: return _w_rain;
    case 4: return _w_time;
    case 5: return _w_last;
    default: return 0.0f;
  }
}

void DryoutPredictor::saveToFlash() {
  Preferences p;
  p.begin(NS, false);
  p.putFloat("bias",    _bias);
  p.putFloat("w0",      _w_soil);
  p.putFloat("w1",      _w_temp);
  p.putFloat("w2",      _w_humidity);
  p.putFloat("w3",      _w_rain);
  p.putFloat("w4",      _w_time);
  p.putFloat("w5",      _w_last);
  p.end();
  Serial.println("[AI] Weights saved to flash");
}

void DryoutPredictor::loadFromFlash() {
  Preferences p;
  p.begin(NS, true);
  _bias       = p.getFloat("bias",    DRYOUT_BIAS_DEFAULT);
  _w_soil     = p.getFloat("w0",      DRYOUT_W_SOIL_DEFAULT);
  _w_temp     = p.getFloat("w1",      DRYOUT_W_TEMP_DEFAULT);
  _w_humidity = p.getFloat("w2",      DRYOUT_W_HUM_DEFAULT);
  _w_rain     = p.getFloat("w3",      DRYOUT_W_RAIN_DEFAULT);
  _w_time     = p.getFloat("w4",      DRYOUT_W_TIME_DEFAULT);
  _w_last     = p.getFloat("w5",      DRYOUT_W_LAST_DEFAULT);
  p.end();
  Serial.println("[AI] Weights loaded from flash");
}

void DryoutPredictor::reset() {
  _bias       = DRYOUT_BIAS_DEFAULT;
  _w_soil     = DRYOUT_W_SOIL_DEFAULT;
  _w_temp     = DRYOUT_W_TEMP_DEFAULT;
  _w_humidity = DRYOUT_W_HUM_DEFAULT;
  _w_rain     = DRYOUT_W_RAIN_DEFAULT;
  _w_time     = DRYOUT_W_TIME_DEFAULT;
  _w_last     = DRYOUT_W_LAST_DEFAULT;
  Serial.println("[AI] Weights reset to defaults");
}