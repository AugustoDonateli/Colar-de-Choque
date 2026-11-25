#pragma once
struct DormiuSim {};
namespace sim { extern bool dormiu; }
inline void esp_deep_sleep_start() { sim::dormiu = true; throw DormiuSim(); }
