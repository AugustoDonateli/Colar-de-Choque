#pragma once
namespace sim { extern bool rfCheio; extern uint32_t rfValor; extern uint8_t rfBits; }
class RCSwitch { public:
  void enableReceive(int) {}
  bool available() { return sim::rfCheio; }
  unsigned long getReceivedValue() { return sim::rfValor; }
  unsigned int getReceivedBitlength() { return sim::rfBits; }
  unsigned int getReceivedProtocol() { return 1; }
  unsigned int getReceivedDelay() { return 350; }
  void resetAvailable() { sim::rfCheio = false; }
};
