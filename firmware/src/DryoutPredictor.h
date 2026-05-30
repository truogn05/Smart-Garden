#ifndef DRYOUT_PREDICTOR_H
#define DRYOUT_PREDICTOR_H

#include <Arduino.h>
#include <Preferences.h>

/**
 * Online linear regression — soil dry-out predictor.
 * 7 floats × 4 bytes = 28 bytes total RAM.
 * Learns from each watering cycle, persists to flash via Preferences.
 */
class DryoutPredictor {
public:
  DryoutPredictor();

  // Run prediction. Returns hours until soil < 30% moisture (clamped 1-72).
  float predict(float soilMoisture, float temp, float humidity,
                float rainIntensity, float timeOfDay, float lastWateringDuration);

  // Update weights from actual outcome. Call after watering cycle completes.
  void update(float soilMoisture, float temp, float humidity,
              float rainIntensity, float timeOfDay, float lastWateringDuration,
              float actualHours);

  // Persist all 7 weights to flash
  void saveToFlash();

  // Load all 7 weights from flash
  void loadFromFlash();

  // Reset to default weights
  void reset();

  // Getters for logging/debug
  float getBias() const { return _bias; }
  float getWeight(uint8_t i) const;

private:
  float _bias;
  float _w_soil;
  float _w_temp;
  float _w_humidity;
  float _w_rain;
  float _w_time;
  float _w_last;
  float _lr;

  static constexpr const char* NS = "dryout-predictor";

  float dot(float soil, float temp, float humidity, float rain, float time, float last) const;
};

#endif // DRYOUT_PREDICTOR_H