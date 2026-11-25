#pragma once
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <cctype>
#include <cstdarg>
#include <string>
#include <vector>
#include <map>
#define HIGH 1
#define LOW 0
#define OUTPUT 1
#define INPUT 0
#define INPUT_PULLUP 2
#define ARDUINO_USB_CDC_ON_BOOT 1
enum { ADC_0db, ADC_2_5db, ADC_6db, ADC_11db };
namespace sim {
  extern uint32_t agora;
  extern int pinos[32];
  extern uint32_t adcMv;
  extern std::string entradaSerial;
  extern bool imprimir;
  void tick(uint32_t ms);
}
inline uint32_t millis() { return sim::agora; }
inline void delay(uint32_t ms) { sim::tick(ms); }
inline void pinMode(uint8_t, uint8_t) {}
inline void digitalWrite(uint8_t p, uint8_t v) { sim::pinos[p] = v; }
inline int digitalRead(uint8_t p) { return sim::pinos[p]; }
inline int digitalPinToInterrupt(int p) { return p; }
inline void analogReadResolution(int) {}
inline void analogSetPinAttenuation(int, int) {}
inline uint32_t analogReadMilliVolts(int) { return sim::adcMv; }
inline bool setCpuFrequencyMhz(uint32_t) { return true; }
struct MockSerial {
  explicit operator bool() const { return true; }
  void begin(int) {}
  void setTxTimeoutMs(int) {}
  int available() { return (int)sim::entradaSerial.size(); }
  int read() { char c = sim::entradaSerial[0]; sim::entradaSerial.erase(0, 1); return c; }
  void printf(const char* f, ...) { if (!sim::imprimir) return; va_list a; va_start(a, f); vprintf(f, a); va_end(a); }
  void println(const char* s) { if (sim::imprimir) puts(s); }
};
extern MockSerial Serial;
struct ReinicioSim {};
struct MockESP { void restart() { throw ReinicioSim(); } };
extern MockESP ESP;
