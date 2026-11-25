#pragma once
namespace sim { extern std::map<std::string, std::vector<uint8_t>> flash; extern int gravacoes; }
class Preferences { public:
  bool begin(const char*, bool) { return true; }
  size_t getBytesLength(const char* k) { auto it = sim::flash.find(k); return it == sim::flash.end() ? 0 : it->second.size(); }
  size_t getBytes(const char* k, void* b, size_t n) { auto& v = sim::flash[k]; memcpy(b, v.data(), n < v.size() ? n : v.size()); return n; }
  size_t putBytes(const char* k, const void* b, size_t n) { sim::gravacoes++; sim::flash[k].assign((const uint8_t*)b, (const uint8_t*)b + n); return n; }
  float getFloat(const char* k, float d) { auto it = sim::flash.find(k); if (it == sim::flash.end()) return d; float f; memcpy(&f, it->second.data(), 4); return f; }
  size_t putFloat(const char* k, float f) { sim::flash[k].assign((uint8_t*)&f, (uint8_t*)&f + 4); return 4; }
};
